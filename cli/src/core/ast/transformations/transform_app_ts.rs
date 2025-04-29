use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::{Expression, SourceType, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    injections::{
        inject_into_app_ts::inject_into_app_ts,
        inject_into_exported_api_client::inject_into_exported_api_client,
        inject_into_import_statement::inject_into_import_statement,
    },
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_app_ts(router_name: &str, base_path: &String) -> Result<String> {
    let allocator = Allocator::default();
    let app_path = Path::new(base_path).join("server.ts");
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
        "import {{ {router_name_pascal_case}Routes }} from './api/routes/{router_name_camel_case}.routes';",
    );
    let mut forklaunch_routes_import_injection =
        parse_ast_program(&allocator, &forklaunch_routes_import_text, app_source_type);

    inject_into_import_statement(
        &mut app_program,
        &mut forklaunch_routes_import_injection,
        format!("./api/routes/{router_name_camel_case}.routes").as_str(),
        // "/api/routes/",
        // format!("{router_name_pascal_case}Routes").as_str(),
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
