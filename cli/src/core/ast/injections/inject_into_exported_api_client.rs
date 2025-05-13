use anyhow::{bail, Result};
use oxc_ast::ast::{Declaration, Expression, Program, Statement, TSType};

pub(crate) fn inject_into_exported_api_client<'a>(
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
