use std::{fs::read_to_string, path::Path};

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
        database::match_database,
    },
};

pub(crate) fn transform_mikroorm_config_ts(
    base_path: &Path,
    existing_database: &Database,
    database: &Database,
    in_memory: bool,
) -> Result<String> {
    let allocator = Allocator::default();
    let mikro_orm_config_path = base_path.join("mikro-orm.config.ts");
    let mikro_orm_config_text = &read_to_string(&mikro_orm_config_path)?;
    let mikro_orm_config_type = SourceType::from_path(&mikro_orm_config_path)?;

    let mut mikro_orm_config_program =
        parse_ast_program(&allocator, &mikro_orm_config_text, mikro_orm_config_type);

    let database_driver_import_text = format!(
        "import {{ {} }} from \"@mikro-orm/{}\";",
        match_database(database),
        database.to_string().to_lowercase()
    );
    let mut database_driver_import_program =
        parse_ast_program(&allocator, &database_driver_import_text, SourceType::ts());
    replace_import_statment(
        &mut mikro_orm_config_program,
        &mut database_driver_import_program,
        &format!(
            "@mikro-orm/{}",
            existing_database.to_string().to_lowercase()
        ),
    );

    let driver_text = format!("let driver = {};", match_database(database));
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

                for prop in expression.properties.iter() {
                    let ObjectPropertyKind::ObjectProperty(prop) = prop else {
                        continue;
                    };

                    if let PropertyKey::Identifier(id) = &prop.key {
                        if in_memory
                            && ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"]
                                .contains(&id.name.as_str())
                        {
                            continue;
                        }
                    }

                    new_properties.push(ObjectPropertyKind::ObjectProperty(
                        prop.clone_in(&allocator),
                    ));
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

                for property in expression.properties.iter_mut() {
                    let ObjectPropertyKind::ObjectProperty(prop) = property else {
                        continue;
                    };

                    if let PropertyKey::Identifier(id) = &prop.clone_in(&allocator).key {
                        if in_memory
                            && ["host", "port", "user", "password"].contains(&id.name.as_str())
                        {
                            continue;
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

                        new_properties.push(ObjectPropertyKind::ObjectProperty(
                            prop.clone_in(&allocator),
                        ));
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
