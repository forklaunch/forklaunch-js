use std::borrow::Cow;
use std::{fs::read_to_string, path::Path};

use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_ast::ast::{Argument, Declaration, Expression, TSType};
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
) {
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
    }
}

fn inject_into_app_ts<'a, F>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    app_ts_injection_pos: F,
) where
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
        }
    }
}

fn inject_into_export_declaration<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
) {
    app_program_ast.body.iter_mut().for_each(|stmt| {
        let export = match stmt {
            Statement::ExportNamedDeclaration(export) => export,
            _ => return,
        };

        let ts_declaration = match &mut export.declaration {
            Some(Declaration::TSTypeAliasDeclaration(ts_decl)) => ts_decl,
            _ => return,
        };

        if ts_declaration.id.name.contains("ApiClient") {
            return;
        }

        let type_reference = match &mut ts_declaration.type_annotation {
            TSType::TSTypeReference(type_ref) => type_ref,
            _ => return,
        };

        let inner_sdk_instantiations = match type_reference
            .type_parameters
            .as_mut()
            .and_then(|tp| tp.params.first_mut())
        {
            Some(TSType::TSTypeLiteral(inner)) => inner,
            _ => return,
        };

        let expr = match injection_program_ast.body.first_mut() {
            Some(Statement::ExpressionStatement(expr)) => expr,
            _ => return,
        };

        let inst = match &mut expr.expression {
            Expression::TSInstantiationExpression(inst) => inst,
            _ => return,
        };

        let injected = match inst.type_parameters.params.first_mut() {
            Some(TSType::TSTypeLiteral(injected)) => injected,
            _ => return,
        };

        inner_sdk_instantiations
            .members
            .extend(injected.members.drain(..));
    });
}

fn inject_into_bootstrapper_config_validator<'a>(
    bootstrapper_program: &mut Program<'a>,
    config_validator_injection: &mut Program<'a>,
) {
    for stmt in bootstrapper_program.body.iter_mut() {
        // Find the configValidator export
        let export = match stmt {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let variable_declaration = match &mut export.declaration {
            Some(Declaration::VariableDeclaration(decl)) => decl,
            _ => continue,
        };

        let variable_declarator = match variable_declaration.declarations.first_mut() {
            Some(declarator) => declarator,
            _ => continue,
        };

        match variable_declarator.id.kind.get_identifier_name() {
            Some(name) if name == "configValidator" => name,
            _ => continue,
        };

        let object_expression = match &mut variable_declarator.init {
            Some(Expression::ObjectExpression(obj)) => obj,
            _ => continue,
        };

        // Get the injection object
        let injected_export = match config_validator_injection.body.first_mut() {
            Some(Statement::ExportNamedDeclaration(export)) => export,
            _ => continue,
        };

        let injected_decl = match &mut injected_export.declaration {
            Some(Declaration::VariableDeclaration(decl)) => decl,
            _ => continue,
        };

        let injected_declarator = match injected_decl.declarations.first_mut() {
            Some(declarator) => declarator,
            _ => continue,
        };

        let injected_obj = match &mut injected_declarator.init {
            Some(Expression::ObjectExpression(obj)) => obj,
            _ => continue,
        };

        // Merge the properties
        object_expression
            .properties
            .extend(injected_obj.properties.drain(..));
    }
}

fn inject_into_bootstrapper_config_injector<'a>(
    bootstrapper_program: &mut Program<'a>,
    config_injector_injection: &mut Program<'a>,
) {
    for statement in &mut bootstrapper_program.body {
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

        // Get the first expression statement
        let expression = match function_body.statements.first_mut() {
            Some(Statement::ExpressionStatement(expr)) => expr,
            _ => continue,
        };

        // Get the call expression
        let call_expression = match &mut expression.expression {
            Expression::CallExpression(call) => call,
            _ => continue,
        };

        // Get the arrow function argument
        let arrow_function = match call_expression.arguments.first_mut() {
            Some(Argument::ArrowFunctionExpression(arrow)) => arrow,
            _ => continue,
        };

        // Get the variable declaration
        let var_decl = match arrow_function.body.statements.first_mut() {
            Some(Statement::VariableDeclaration(decl)) => decl,
            _ => continue,
        };

        // Get the variable declarator
        let var_declarator = match var_decl.declarations.first_mut() {
            Some(declarator) => declarator,
            None => continue,
        };

        // Get the new expression
        let new_expr = match &mut var_declarator.init {
            Some(Expression::NewExpression(new_expr)) => new_expr,
            _ => continue,
        };

        // For each argument in the new expression
        for argument in &mut new_expr.arguments {
            let object_expr = match argument {
                Argument::ObjectExpression(obj) => obj,
                _ => continue,
            };

            // Get the injected variable declaration
            let injected_var_decl = match config_injector_injection.body.first_mut() {
                Some(Statement::VariableDeclaration(decl)) => decl,
                _ => continue,
            };

            // Get the injected variable declarator
            let injected_declarator = match injected_var_decl.declarations.first_mut() {
                Some(declarator) => declarator,
                None => continue,
            };

            // Get the injected new expression
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
            }
        }
    }
}

pub(crate) fn transform_app_ts(router_name: &str, base_path: &String) -> String {
    let allocator = Allocator::default();
    let app_path = Path::new(base_path).join("server.ts");
    let app_source_text = read_to_string(&app_path).unwrap();
    let app_source_type = SourceType::from_path(&app_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut app_program = parse_ast_program(&allocator, &app_source_text, app_source_type);

    let forklaunch_controller_import_text = format!(
        "import {{ {router_name_pascal_case}Controller }} from './controllers/{router_name_camel_case}.controller';",
    );
    let mut forklaunch_controller_import_injection = parse_ast_program(
        &allocator,
        &forklaunch_controller_import_text,
        app_source_type,
    );
    inject_into_import_statement(
        &mut app_program,
        &mut forklaunch_controller_import_injection,
        "/controllers/",
        format!("{router_name_pascal_case}Controller").as_str(),
    );

    let scoped_service_factory_injection_text = format!(
        "const scoped{router_name_pascal_case}ServiceFactory = ci.scopedResolver('{router_name_camel_case}Service');",
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
    });

    let routes_injection_text = format!(
        "const {router_name_camel_case}Routes = {router_name_pascal_case}Routes(new {router_name_pascal_case}Controller(() => ci.createScope(), scoped{router_name_pascal_case}ServiceFactory));",
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
    });

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
    });

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
    );

    let api_client_skeleton_text =
        format!("ApiClient<{{{router_name_camel_case}: typeof {router_name_pascal_case}Routes}}>");
    let mut injected_api_client_skeleton =
        parse_ast_program(&allocator, &api_client_skeleton_text, app_source_type);
    inject_into_export_declaration(&mut app_program, &mut injected_api_client_skeleton);

    CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&app_program)
        .code
}

pub(crate) fn transform_bootstrapper_ts(router_name: &str, base_path: &String) -> String {
    let allocator = Allocator::default();
    let bootstrapper_path = Path::new(base_path).join("bootstrapper.ts");
    let bootstrapper_source_text = read_to_string(&bootstrapper_path).unwrap();
    let bootstrapper_source_type = SourceType::from_path(&bootstrapper_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut bootstrapper_program = parse_ast_program(
        &allocator,
        &bootstrapper_source_text,
        bootstrapper_source_type,
    );

    let forklaunch_routes_import_text = format!(
        "import {{ Base{router_name_pascal_case}Service }} from './services/{router_name_camel_case}.service';",
    );
    let mut forklaunch_routes_import_injection = parse_ast_program(
        &allocator,
        &forklaunch_routes_import_text,
        bootstrapper_source_type,
    );
    inject_into_import_statement(
        &mut bootstrapper_program,
        &mut forklaunch_routes_import_injection,
        "/services/",
        format!("Base{router_name_pascal_case}Services").as_str(),
    );

    let config_validator_text = format!(
        "export const configValidator = {{
            {router_name_camel_case}Service: Base{router_name_pascal_case}Service
        }}"
    );
    let mut config_validator_injection =
        parse_ast_program(&allocator, &config_validator_text, bootstrapper_source_type);
    inject_into_bootstrapper_config_validator(
        &mut bootstrapper_program,
        &mut config_validator_injection,
    );

    let config_injector_text = format!(
        "const configInjector = new ConfigInjector(configValidator, SchemaValidator(), {{
        {router_name_camel_case}Service: {{
          lifetime: Lifetime.Scoped,
          factory: (
            {{ entityManager }},
            resolve,
            context
          ) => {{
            let em = entityManager;
            if (context.entityManagerOptions) {{
              em = resolve('entityManager', context);
            }}
            return new Base{router_name_pascal_case}Service(
              em
            );
          }}
        }}
    }})"
    );

    let mut config_injector_injection =
        parse_ast_program(&allocator, &config_injector_text, bootstrapper_source_type);
    inject_into_bootstrapper_config_injector(
        &mut bootstrapper_program,
        &mut config_injector_injection,
    );

    CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&bootstrapper_program)
        .code
}
