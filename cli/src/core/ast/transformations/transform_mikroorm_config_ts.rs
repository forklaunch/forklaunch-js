use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{Argument, Expression, ObjectPropertyKind, PropertyKey, SourceType, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::{
    constants::Database,
    core::{
        ast::{
            parse_ast_program::{parse_ast_expression, parse_ast_program},
            replacements::replace_import_statment::replace_import_statment,
        },
        database::{get_db_driver, is_in_memory_database},
    },
};

pub(crate) fn transform_mikroorm_config_ts(
    base_path: &Path,
    existing_database: &Option<Database>,
    database: &Database,
) -> Result<String> {
    let in_memory = is_in_memory_database(database);

    let is_mongo = match database {
        Database::MongoDB => true,
        _ => false,
    };

    let allocator = Allocator::default();
    let mikro_orm_config_path = base_path.join("mikro-orm.config.ts");
    let mikro_orm_config_text = &read_to_string(&mikro_orm_config_path)?;
    let mikro_orm_config_type = SourceType::from_path(&mikro_orm_config_path)?;

    let mut mikro_orm_config_program =
        parse_ast_program(&allocator, &mikro_orm_config_text, mikro_orm_config_type);

    if database == &Database::MongoDB {
        let _ = replace_import_statment(
            &mut mikro_orm_config_program,
            &mut parse_ast_program(
                &allocator,
                &"import { Migrator } from '@mikro-orm/migrations';",
                SourceType::ts(),
            ),
            "@mikro-orm/migrations",
        );
    }

    let database_driver_import_text = format!(
        "import {{ {} }} from \"@mikro-orm/{}\";",
        get_db_driver(database),
        database.to_string().to_lowercase()
    );
    let mut database_driver_import_program =
        parse_ast_program(&allocator, &database_driver_import_text, SourceType::ts());
    if let Some(existing_database) = existing_database {
        let _ = replace_import_statment(
            &mut mikro_orm_config_program,
            &mut database_driver_import_program,
            &format!(
                "@mikro-orm/{}",
                existing_database.to_string().to_lowercase()
            ),
        );
    }

    let driver_text = format!("let driver = {};", get_db_driver(database));
    let migrations_text = format!(
        "let migrations = {{
            path: 'dist/migrations-{}',
            pathTs: 'migrations-{}'
        }};",
        database.to_string().to_lowercase(),
        database.to_string().to_lowercase()
    );

    for stmt in mikro_orm_config_program.body.iter_mut() {
        let declaration = match stmt {
            Statement::VariableDeclaration(import) => import,
            _ => continue,
        };

        let call_expression = match declaration.declarations[0].init.as_mut() {
            Some(Expression::CallExpression(call_expr)) => call_expr,
            _ => continue,
        };

        if call_expression
            .callee_name()
            .is_some_and(|name| name == "createConfigInjector")
        {
            for arg in call_expression.arguments.iter_mut() {
                let expression = match arg {
                    Argument::ObjectExpression(expression) => expression,
                    _ => continue,
                };

                let mut new_properties = Vec::new_in(&allocator);
                let mut visited_properties = HashSet::new();

                for prop in expression.properties.iter() {
                    let ObjectPropertyKind::ObjectProperty(prop) = prop else {
                        continue;
                    };

                    if let PropertyKey::StaticIdentifier(id) = &prop.key {
                        if visited_properties.contains(&id.name.as_str()) {
                            continue;
                        }

                        if ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"]
                            .contains(&id.name.as_str())
                        {
                            if in_memory || is_mongo {
                                continue;
                            }
                        }
                        visited_properties.insert(id.name.as_str());
                    }

                    new_properties.push(ObjectPropertyKind::ObjectProperty(
                        prop.clone_in(&allocator),
                    ));
                }

                let additional_object_props = match database {
                    Database::PostgreSQL
                    | Database::MariaDB
                    | Database::MySQL
                    | Database::MsSQL => {
                        let mut additional_object_props = String::new();
                        for key in ["DB_NAME", "DB_HOST", "DB_USER", "DB_PASSWORD"] {
                            if !visited_properties.contains(key) {
                                additional_object_props.push_str(&format!(
                                    "{}: {{
                                        lifetime: Lifetime.Singleton,
                                        type: string,
                                        value: getEnvVar('{}')
                                    }},\n",
                                    key, key
                                ));
                            }
                        }
                        if !visited_properties.contains("DB_PORT") {
                            additional_object_props.push_str(&format!(
                                "DB_PORT: {{
                                        lifetime: Lifetime.Singleton,
                                        type: number,
                                        value: Number(getEnvVar('DB_PORT'))
                                    }},\n",
                            ));
                        }
                        let additional_object_props = format!(
                            "const n = {{
                            {additional_object_props}
                        }};"
                        );
                        parse_ast_expression(
                            &allocator,
                            allocator.alloc_str(&additional_object_props),
                            SourceType::ts(),
                        )
                    }
                    Database::MongoDB => {
                        let mut additional_object_props = String::new();
                        for key in ["DB_HOST", "DB_USER", "DB_PASSWORD"] {
                            if !visited_properties.contains(key) {
                                additional_object_props.push_str(&format!(
                                    "{}: {{
                                        lifetime: Lifetime.Singleton,
                                        type: string,
                                        value: getEnvVar('{}')
                                    }},\n",
                                    key, key
                                ));
                            }
                        }
                        if !visited_properties.contains("DB_PORT") {
                            additional_object_props.push_str(&format!(
                                "DB_PORT: {{
                                        lifetime: Lifetime.Singleton,
                                        type: number,
                                        value: Number(getEnvVar('DB_PORT'))
                                    }},\n",
                            ));
                        }
                        let additional_object_props = format!(
                            "const n = {{
                            {additional_object_props}
                        }};"
                        );
                        parse_ast_expression(
                            &allocator,
                            allocator.alloc_str(&additional_object_props),
                            SourceType::ts(),
                        )
                    }
                    _ => None,
                };

                if let Some(additional_object_props) = additional_object_props {
                    match additional_object_props {
                        Expression::ObjectExpression(object_expression) => {
                            for prop in object_expression.properties.iter() {
                                new_properties.push(prop.clone_in(&allocator));
                            }
                        }
                        _ => {}
                    }
                }

                expression.properties = new_properties;
            }
        }

        if call_expression
            .callee_name()
            .is_some_and(|name| name == "defineConfig")
        {
            for arg in call_expression.arguments.iter_mut() {
                let expression = match arg {
                    Argument::ObjectExpression(expression) => expression,
                    _ => continue,
                };

                let mut new_properties = Vec::new_in(&allocator);
                let mut visited_properties = HashSet::new();

                for property in expression.properties.iter_mut() {
                    let ObjectPropertyKind::ObjectProperty(prop) = property else {
                        continue;
                    };

                    if let PropertyKey::StaticIdentifier(id) = &prop.clone_in(&allocator).key {
                        if visited_properties.contains(&id.name.as_str()) {
                            continue;
                        }

                        if ["host", "port", "user", "password"].contains(&id.name.as_str()) {
                            if in_memory || is_mongo {
                                continue;
                            }
                        }

                        if id.name == "clientUrl" {
                            if !is_mongo {
                                continue;
                            }
                        }

                        if id.name == "driver" {
                            if let Some(driver_expression) =
                                parse_ast_expression(&allocator, &driver_text, SourceType::ts())
                            {
                                prop.value = driver_expression;
                            }
                        }

                        if id.name == "migrations" {
                            if let Some(migrations_expression) =
                                parse_ast_expression(&allocator, &migrations_text, SourceType::ts())
                            {
                                prop.value = migrations_expression;
                            }
                        }

                        visited_properties.insert(id.name.as_str());
                    }
                    new_properties.push(ObjectPropertyKind::ObjectProperty(
                        prop.clone_in(&allocator),
                    ));
                }

                let additional_object_props = match database {
                    Database::PostgreSQL
                    | Database::MariaDB
                    | Database::MySQL
                    | Database::MsSQL => {
                        let mut additional_object_props = String::new();
                        for (key, value) in [
                            ("dbName", "DB_NAME"),
                            ("host", "DB_HOST"),
                            ("user", "DB_USER"),
                            ("password", "DB_PASSWORD"),
                            ("port", "DB_PORT"),
                        ] {
                            if !visited_properties.contains(key) {
                                additional_object_props.push_str(&format!(
                                    "{}: validConfigInjector.resolve('{}'),\n",
                                    key, value
                                ));
                            }
                        }
                        let additional_object_props = format!(
                            "const n = {{
                            {additional_object_props}
                        }};"
                        );
                        parse_ast_expression(
                            &allocator,
                            allocator.alloc_str(&additional_object_props),
                            SourceType::ts(),
                        )
                    }
                    Database::MongoDB => {
                        if !visited_properties.contains("clientUrl") {
                            parse_ast_expression(
                                &allocator,
                                &"const n = {
                                    clientUrl: `mongodb://${validConfigInjector.resolve(
                                        'DB_USER'
                                    )}:${validConfigInjector.resolve('DB_PASSWORD')}@${validConfigInjector.resolve(
                                        'DB_HOST'
                                    )}:${validConfigInjector.resolve('DB_PORT')}/${validConfigInjector.resolve(
                                        'DB_NAME'
                                    )}?authSource=admin&directConnection=true&replicaSet=rs0`
                                };",
                            SourceType::ts(),
                        )
                        } else {
                            None
                        }
                    }
                    _ => None,
                };

                if let Some(additional_object_props) = additional_object_props {
                    match additional_object_props {
                        Expression::ObjectExpression(object_expression) => {
                            for prop in object_expression.properties.iter() {
                                new_properties.push(prop.clone_in(&allocator));
                            }
                        }
                        _ => {}
                    }
                }

                expression.properties = new_properties;
            }
        }
    }

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&mikro_orm_config_program)
        .code)
}
