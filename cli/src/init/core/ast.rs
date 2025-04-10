// TODO: Refactor this into a directory with separated functions
use std::borrow::Cow;
use std::{fs::read_to_string, path::Path};

use anyhow::{bail, Result};
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::{Argument, Declaration, Expression, TSType};
use oxc_ast::ast::{ObjectProperty, PropertyDefinition, SourceType};
use oxc_ast::ast::{Program, Statement};
use oxc_codegen::CodeGenerator;
use oxc_codegen::CodegenOptions;
use oxc_parser::Parser;

pub(crate) fn parse_ast_program<'a>(
    allocator: &'a Allocator,
    source_text: &'a str,
    source_type: SourceType,
) -> Program<'a> {
    Parser::new(allocator, source_text, source_type)
        .parse()
        .program
}

fn inject_into_import_statement<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    import_source_identifier: &str,
    import_name_identifier: &str,
) -> Result<()> {
    let mut injection_pos = None;
    let mut found_import = false;

    app_program_ast
        .body
        .iter()
        .enumerate()
        .for_each(|(index, stmt)| {
            let import = match stmt {
                Statement::ImportDeclaration(import) => import,
                _ => return,
            };

            if !import.source.value.contains(import_source_identifier) {
                return;
            }

            let specifiers = match &import.specifiers {
                Some(specifiers) => specifiers,
                None => return,
            };

            if specifiers.len() == 1
                && specifiers.first().unwrap().name() > Cow::Borrowed(import_name_identifier)
            {
                found_import = true;
                if injection_pos.is_none() {
                    injection_pos = Some(index);
                }
                return;
            }

            if !found_import {
                injection_pos = Some(index + 1);
            }
        });

    if let Some(index) = injection_pos {
        for stmt in injection_program_ast.body.drain(..).rev() {
            app_program_ast.body.insert(index, stmt);
        }
        Ok(())
    } else {
        bail!("Failed to inject into import statement")
    }
}

fn inject_into_app_ts<'a, F>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    app_ts_injection_pos: F,
) -> Result<()>
where
    F: Fn(&oxc_allocator::Vec<'a, Statement>) -> Option<usize>,
{
    for stmt in &mut app_program_ast.body {
        let expr = match stmt {
            Statement::ExpressionStatement(expr) => expr,
            _ => continue,
        };

        let call = match &mut expr.expression {
            Expression::CallExpression(call) => call,
            _ => continue,
        };

        for arg in &mut call.arguments {
            let arrow = match arg.as_expression_mut() {
                Some(Expression::ArrowFunctionExpression(arrow)) => arrow,
                _ => continue,
            };

            let splice_pos = match app_ts_injection_pos(&arrow.body.statements) {
                Some(pos) => pos,
                None => continue,
            };

            for stmt in injection_program_ast.body.drain(..).rev() {
                arrow.body.statements.insert(splice_pos, stmt);
            }

            return Ok(());
        }
    }

    bail!("Failed to inject into app.ts")
}

fn inject_into_exported_api_client<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
) -> Result<()> {
    for stmt in app_program_ast.body.iter_mut() {
        let export = match stmt {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let ts_declaration = match &mut export.declaration {
            Some(Declaration::TSTypeAliasDeclaration(ts_decl)) => ts_decl,
            _ => continue,
        };

        if !ts_declaration.id.name.contains("ApiClient") {
            continue;
        }

        let type_reference = match &mut ts_declaration.type_annotation {
            TSType::TSTypeReference(type_ref) => type_ref,
            _ => continue,
        };

        let inner_sdk_instantiations = match type_reference
            .type_parameters
            .as_mut()
            .and_then(|tp| tp.params.iter_mut().find(|_| true))
        {
            Some(TSType::TSTypeLiteral(inner)) => inner,
            _ => continue,
        };

        for stmt in &mut injection_program_ast.body {
            let expr = match stmt {
                Statement::ExpressionStatement(expr) => expr,
                _ => continue,
            };

            let inst = match &mut expr.expression {
                Expression::TSInstantiationExpression(inst) => inst,
                _ => continue,
            };

            for param in inst.type_parameters.params.iter_mut() {
                let injected = match param {
                    TSType::TSTypeLiteral(injected) => injected,
                    _ => continue,
                };

                inner_sdk_instantiations
                    .members
                    .extend(injected.members.drain(..));

                return Ok(());
            }
        }
    }

    bail!("Failed to inject into export declaration");
}

fn inject_into_registrations_config_injector<'a>(
    registrations_program: &mut Program<'a>,
    config_injector_injection: &mut Program<'a>,
) {
    for statement in &mut registrations_program.body {
        // Find the export named declaration
        let export = match statement {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        // Get the function declaration
        let function = match &mut export.declaration {
            Some(Declaration::FunctionDeclaration(function)) => function,
            _ => continue,
        };

        // Get the function body
        let function_body = match &mut function.body {
            Some(body) => body,
            None => continue,
        };

        for statement in function_body.statements.iter_mut() {
            // Get the expression statement
            let expression = match statement {
                Statement::VariableDeclaration(expr) => expr,
                _ => continue,
            };

            match expression.declarations[0].id.get_identifier_name() {
                Some(name) => {
                    if name != "serviceDependencies" {
                        continue;
                    }
                }
                None => continue,
            }

            // Get the call expression
            let call_expression = match &mut expression.declarations[0].init {
                Some(Expression::CallExpression(call)) => call,
                _ => continue,
            };

            for argument in &mut call_expression.arguments {
                let object_expr = match argument {
                    Argument::ObjectExpression(object_expr) => object_expr,
                    _ => continue,
                };

                // Process each statement in the injection
                for injected_stmt in config_injector_injection.body.iter_mut() {
                    let injected_var_decl = match injected_stmt {
                        Statement::VariableDeclaration(decl) => decl,
                        _ => continue,
                    };

                    for injected_declarator in injected_var_decl.declarations.iter_mut() {
                        let injected_new_expr = match &mut injected_declarator.init {
                            Some(Expression::NewExpression(new_expr)) => new_expr,
                            _ => continue,
                        };

                        // For each argument in the injected new expression
                        for injected_arg in &mut injected_new_expr.arguments {
                            let injected_obj = match injected_arg {
                                Argument::ObjectExpression(obj) => obj,
                                _ => continue,
                            };

                            // Extend the properties
                            object_expr
                                .properties
                                .extend(injected_obj.properties.drain(..));

                            return;
                        }
                    }
                }
            }
        }
    }
}

fn inject_export_into_index_ts<'a>(
    entities_index_program: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<()> {
    let mut maybe_splice_pos = None;

    entities_index_program
        .body
        .iter()
        .enumerate()
        .for_each(|(index, stmt)| {
            let expr = match stmt {
                Statement::ExportNamedDeclaration(expr) => expr,
                _ => return,
            };

            if let Some(source) = &expr.source {
                if source.value.as_str() <= router_name_camel_case {
                    maybe_splice_pos = Some(index);
                }
            }
        });

    if let Some(splice_pos) = maybe_splice_pos {
        for stmt in injection_program_ast.body.drain(..).rev() {
            entities_index_program.body.insert(splice_pos, stmt);
        }
    }

    Ok(())
}

pub(crate) fn transform_app_ts(
    router_name: &str,
    is_worker: bool,
    base_path: &String,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_path = Path::new(base_path).join(if is_worker { "worker.ts" } else { "server.ts" });
    let app_source_text = read_to_string(&app_path).unwrap();
    let app_source_type = SourceType::from_path(&app_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut app_program = parse_ast_program(&allocator, &app_source_text, app_source_type);

    let scoped_service_factory_injection_text = format!(
        "const scoped{router_name_pascal_case}ServiceFactory = ci.scopedResolver(tokens.{router_name_pascal_case}Service);",
    );
    let mut injection_program_ast = parse_ast_program(
        &allocator,
        &scoped_service_factory_injection_text,
        SourceType::ts(),
    );
    inject_into_app_ts(&mut app_program, &mut injection_program_ast, |statements| {
        let mut maybe_splice_pos = None;

        statements
            .iter()
            .enumerate()
            .for_each(|(index, inner_stmt)| {
                let expr = match inner_stmt {
                    Statement::VariableDeclaration(expr) => expr,
                    _ => return,
                };

                let call = match &expr.declarations[0].init {
                    Some(Expression::CallExpression(call)) => call,
                    _ => return,
                };

                let expr_member = match &call.callee {
                    Expression::StaticMemberExpression(expr_member) => expr_member,
                    _ => return,
                };

                let identifier = match &expr_member.object {
                    Expression::Identifier(identifier) => identifier,
                    _ => return,
                };

                if identifier.name == "ci" && expr_member.property.name == "scopedResolver" {
                    maybe_splice_pos = Some(index + 1);
                }
            });
        maybe_splice_pos
    })?;

    let routes_injection_text = format!(
        "const {router_name_camel_case}Routes = {router_name_pascal_case}Routes(() => ci.createScope(), scoped{router_name_pascal_case}ServiceFactory, openTelemetryCollector);",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &routes_injection_text, SourceType::ts());
    inject_into_app_ts(&mut app_program, &mut injection_program_ast, |statements| {
        let mut maybe_splice_pos = None;

        statements
            .iter()
            .enumerate()
            .for_each(|(index, inner_stmt)| {
                let expr = match inner_stmt {
                    Statement::VariableDeclaration(expr) => expr,
                    _ => return,
                };

                let call = match &expr.declarations[0].init {
                    Some(Expression::CallExpression(call)) => call,
                    _ => return,
                };

                let identifier = match &call.callee {
                    Expression::Identifier(identifier) => identifier,
                    _ => return,
                };

                if identifier.name.contains("Routes") {
                    maybe_splice_pos = Some(index + 1);
                }
            });
        maybe_splice_pos
    })?;

    let use_injection_text = format!("app.use({router_name_camel_case}Routes.router);",);
    let mut injection_program_ast =
        parse_ast_program(&allocator, &use_injection_text, SourceType::ts());
    inject_into_app_ts(&mut app_program, &mut injection_program_ast, |statements| {
        let mut maybe_splice_pos = None;
        statements.iter().enumerate().for_each(|(index, stmt)| {
            let expr = match stmt {
                Statement::ExpressionStatement(expr) => expr,
                _ => return,
            };

            let call = match &expr.expression {
                Expression::CallExpression(call) => call,
                _ => return,
            };

            let member = match &call.callee {
                Expression::StaticMemberExpression(member) => member,
                _ => return,
            };

            let id = match &member.object {
                Expression::Identifier(id) => id,
                _ => return,
            };

            if id.name == "app" && member.property.name == "use" {
                maybe_splice_pos = Some(index + 1);
            }
        });
        maybe_splice_pos
    })?;

    let forklaunch_routes_import_text = format!(
        "import {{ {router_name_pascal_case}Routes }} from './routes/{router_name_camel_case}.routes';",
    );
    let mut forklaunch_routes_import_injection =
        parse_ast_program(&allocator, &forklaunch_routes_import_text, app_source_type);
    inject_into_import_statement(
        &mut app_program,
        &mut forklaunch_routes_import_injection,
        "/routes/",
        format!("{router_name_pascal_case}Routes").as_str(),
    )?;

    let api_client_skeleton_text =
        format!("ApiClient<{{{router_name_camel_case}: typeof {router_name_pascal_case}Routes}}>");
    let mut injected_api_client_skeleton =
        parse_ast_program(&allocator, &api_client_skeleton_text, app_source_type);
    inject_into_exported_api_client(&mut app_program, &mut injected_api_client_skeleton)?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&app_program)
        .code)
}

pub(crate) fn transform_registrations_ts(
    router_name: &str,
    is_worker: bool,
    is_cache_backend: bool,
    base_path: &String,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = Path::new(base_path).join("registrations.ts");
    let registrations_source_text = read_to_string(&registrations_path).unwrap();
    let registrations_source_type = SourceType::from_path(&registrations_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut registrations_program = parse_ast_program(
        &allocator,
        &registrations_source_text,
        registrations_source_type,
    );

    let forklaunch_routes_import_text = format!(
        "import {{ Base{router_name_pascal_case}Service }} from './services/{router_name_camel_case}.service';",
    );
    let mut forklaunch_routes_import_injection = parse_ast_program(
        &allocator,
        &forklaunch_routes_import_text,
        registrations_source_type,
    );
    inject_into_import_statement(
        &mut registrations_program,
        &mut forklaunch_routes_import_injection,
        "/services/",
        format!("Base{router_name_pascal_case}Service").as_str(),
    )?;

    let config_injector_text = format!(
        "const configInjector = new ConfigInjector(configValidator, SchemaValidator(), {{
            {router_name_pascal_case}Service: {{
            lifetime: Lifetime.Scoped,
            type: Base{router_name_pascal_case}Service,
            factory: (
                {{ {}, OpenTelemetryCollector }},
                resolve,
                context
            ) => {{
                let em = EntityManager;
                if (context.entityManagerOptions) {{
                    em = resolve('EntityManager', context);
                }}
                return new Base{router_name_pascal_case}Service(
                    {},
                    OpenTelemetryCollector
                );
            }}
            }}
        }})",
        if is_worker && is_cache_backend {
            "TtlCache"
        } else {
            "EntityManager"
        },
        if is_worker && is_cache_backend {
            "TtlCache"
        } else {
            "em"
        }
    );

    let mut config_injector_injection =
        parse_ast_program(&allocator, &config_injector_text, registrations_source_type);
    inject_into_registrations_config_injector(
        &mut registrations_program,
        &mut config_injector_injection,
    );

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn transform_entities_index_ts(router_name: &str, base_path: &String) -> Result<String> {
    let allocator = Allocator::default();
    let entities_index_path = Path::new(base_path)
        .join("models")
        .join("persistence")
        .join("index.ts");
    let entities_index_source_text = read_to_string(&entities_index_path).unwrap();
    let entities_index_source_type = SourceType::from_path(&entities_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut entities_index_program = parse_ast_program(
        &allocator,
        &entities_index_source_text,
        entities_index_source_type,
    );

    let entities_index_text = format!(
        "export {{ {router_name_pascal_case}Record }} from './{router_name_camel_case}Record.entity';",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &entities_index_text, SourceType::ts());

    inject_export_into_index_ts(
        &mut entities_index_program,
        &mut injection_program_ast,
        &router_name_camel_case,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&entities_index_program)
        .code)
}

pub(crate) fn transform_seeders_index_ts(router_name: &str, base_path: &String) -> Result<String> {
    let allocator = Allocator::default();
    let seeders_index_path = Path::new(base_path)
        .join("models")
        .join("seeders")
        .join("index.ts");
    let seeders_index_source_text = read_to_string(&seeders_index_path).unwrap();
    let seeders_index_source_type = SourceType::from_path(&seeders_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut seeders_index_program = parse_ast_program(
        &allocator,
        &seeders_index_source_text,
        seeders_index_source_type,
    );

    let seeders_index_text = format!(
        "export {{ {router_name_pascal_case}RecordSeeder }} from './{router_name_camel_case}Record.seeder';",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &seeders_index_text, SourceType::ts());

    inject_export_into_index_ts(
        &mut seeders_index_program,
        &mut injection_program_ast,
        &router_name_camel_case,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&seeders_index_program)
        .code)
}

pub(crate) fn transform_constants_data_ts(
    router_name: &str,
    is_worker: bool,
    base_path: &String,
) -> Result<String> {
    let allocator = Allocator::default();
    let constants_data_path = Path::new(base_path).join("constants").join("seed.data.ts");
    let constants_data_source_text = read_to_string(&constants_data_path).unwrap();
    let constants_data_source_type = SourceType::from_path(&constants_data_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut constants_data_program = parse_ast_program(
        &allocator,
        &constants_data_source_text,
        constants_data_source_type,
    );

    let constants_import_text = format!(
        "import {{ {router_name_pascal_case}Record }} from '../models/persistence/{router_name_camel_case}Record.entity';",
    );
    let mut constants_import_injection = parse_ast_program(
        &allocator,
        &constants_import_text,
        constants_data_source_type,
    );
    inject_into_import_statement(
        &mut constants_data_program,
        &mut constants_import_injection,
        "/models/persistence/",
        format!("{router_name_pascal_case}Record").as_str(),
    )?;

    let constants_data_text = format!(
        "export const {router_name_camel_case}Record = {router_name_pascal_case}Record.create({{
            message: 'Test message'{}
        }})",
        if is_worker {
            ",
            processed: false,
            retryCount: 0
            "
        } else {
            ""
        }
    );

    let mut constants_data_injection =
        parse_ast_program(&allocator, &constants_data_text, SourceType::ts());

    constants_data_program
        .body
        .extend(constants_data_injection.body.drain(..));

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&constants_data_program)
        .code)
}
