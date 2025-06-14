use anyhow::{Result, bail};
use convert_case::{Case, Casing};
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{Argument, Declaration, Expression, Program, Statement, TSSignature, TSType};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use super::delete_import_statement::delete_import_statement;

pub(crate) fn delete_from_server_ts<'a, F>(
    server_program_ast: &mut Program<'a>,
    server_ts_injection_pos: F,
) -> Result<()>
where
    F: Fn(&oxc_allocator::Vec<'a, Statement>) -> Option<usize>,
{
    for stmt in &mut server_program_ast.body {
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

            let splice_pos = match server_ts_injection_pos(&arrow.body.statements) {
                Some(pos) => pos,
                None => continue,
            };

            arrow.body.statements.remove(splice_pos);

            return Ok(());
        }
    }

    bail!("Failed to delete from server.ts")
}

pub(crate) fn delete_from_server_exported_api_client<'a>(
    allocator: &'a Allocator,
    server_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<()> {
    for stmt in server_program_ast.body.iter_mut() {
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

        let mut new_inner_sdk_instantiation_members = Vec::new_in(allocator);
        inner_sdk_instantiations.members.iter().for_each(|member| {
            let member_key = match &member {
                TSSignature::TSPropertySignature(member) => &member.key,
                _ => return,
            };

            if let Some(member_name) = member_key.name() {
                if member_name == router_name_camel_case {
                    return;
                }
            }

            new_inner_sdk_instantiation_members.push(member.clone_in(allocator));
        });

        inner_sdk_instantiations.members = new_inner_sdk_instantiation_members;
    }

    Ok(())
}

pub(crate) fn delete_from_server_ts_router<'a>(
    allocator: &'a Allocator,
    server_program: &mut Program<'a>,
    router_name: &str,
) -> Result<String> {
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    delete_from_server_ts(server_program, |statements| {
        let mut maybe_splice_pos = None;

        statements
            .iter()
            .enumerate()
            .for_each(|(index, inner_stmt)| {
                let expr = match inner_stmt {
                    Statement::VariableDeclaration(expr) => expr,
                    _ => return,
                };

                match expr.declarations[0].id.get_identifier_name() {
                    Some(name)
                        if name != format!("scoped{router_name_pascal_case}ServiceFactory") =>
                    {
                        return;
                    }
                    _ => {}
                }

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
                    maybe_splice_pos = Some(index);
                }
            });
        maybe_splice_pos
    })?;

    delete_from_server_ts(server_program, |statements| {
        let mut maybe_splice_pos = None;

        statements
            .iter()
            .enumerate()
            .for_each(|(index, inner_stmt)| {
                let expr = match inner_stmt {
                    Statement::VariableDeclaration(expr) => expr,
                    _ => return,
                };

                match expr.declarations[0].id.get_identifier_name() {
                    Some(name) if name != format!("{router_name_camel_case}Routes") => return,
                    _ => {}
                }

                let call = match &expr.declarations[0].init {
                    Some(Expression::CallExpression(call)) => call,
                    _ => return,
                };

                let identifier = match &call.callee {
                    Expression::Identifier(identifier) => identifier,
                    _ => return,
                };

                if identifier.name.contains("Routes") {
                    maybe_splice_pos = Some(index);
                }
            });
        maybe_splice_pos
    })?;

    delete_from_server_ts(server_program, |statements| {
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

            let arg = match &call.arguments[0] {
                Argument::StaticMemberExpression(arg) => Some(arg),
                _ => None,
            };

            if id.name == "app" && member.property.name == "use" {
                if let Some(arg) = arg {
                    if let Expression::Identifier(object) = &arg.object {
                        if object.name == format!("{router_name_camel_case}Routes").as_str() {
                            maybe_splice_pos = Some(index);
                        }
                    }
                }
            }
        });
        maybe_splice_pos
    })?;

    let _ = delete_import_statement(
        allocator,
        server_program,
        format!("./api/routes/{router_name_camel_case}.routes").as_str(),
    )?;

    delete_from_server_exported_api_client(allocator, server_program, &router_name_camel_case)?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&server_program)
        .code)
}
