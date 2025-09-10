use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{
    Argument, Declaration, Expression, ObjectPropertyKind, Program, PropertyKey, Statement,
};
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::deletions::delete_import_statement::delete_import_statement;

pub(crate) fn delete_from_sdk_client_input<'a>(
    allocator: &'a Allocator,
    sdk_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<String> {
    for stmt in sdk_program_ast.body.iter_mut() {
        let var_decl = match stmt {
            Statement::VariableDeclaration(var_decl) => var_decl,
            Statement::ExportNamedDeclaration(export_decl) => match &mut export_decl.declaration {
                Some(Declaration::VariableDeclaration(var_decl)) => var_decl,
                _ => continue,
            },
            _ => continue,
        };

        for declarator in &mut var_decl.declarations {
            let call_expr = match &mut declarator.init {
                Some(Expression::CallExpression(call)) => call,
                _ => continue,
            };

            let callee = match &call_expr.callee {
                Expression::Identifier(ident) => ident,
                _ => continue,
            };

            if callee.name != "sdkClient" {
                continue;
            }

            for argument in &mut call_expr.arguments {
                let object_expr = match argument {
                    Argument::ObjectExpression(object_expr) => object_expr,
                    _ => continue,
                };

                let mut new_properties = Vec::new_in(allocator);
                object_expr.properties.iter().for_each(|prop| {
                    let prop = match prop {
                        ObjectPropertyKind::ObjectProperty(prop) => prop,
                        _ => return,
                    };
                    let key = match &prop.key {
                        PropertyKey::StaticIdentifier(identifier) => identifier,
                        _ => return,
                    };

                    if key.name.as_str() != router_name_camel_case {
                        new_properties.push(ObjectPropertyKind::ObjectProperty(
                            prop.clone_in(&allocator),
                        ));
                    }
                });
                object_expr.properties = new_properties;
            }
        }
    }

    let _ = delete_import_statement(
        &allocator,
        sdk_program_ast,
        format!("./api/routes/{}.routes", router_name_camel_case).as_str(),
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&sdk_program_ast)
        .code)
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    #[test]
    fn test_successful_deletion_const() {
        let allocator = Allocator::default();

        let sdk_code = r#"
        const testSdk = sdkClient(schemaValidator, {
            userRoutes: userSdkRouter,
            postRoutes: postSdkRouter,
            commentRoutes: commentSdkRouter
        });
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result = delete_from_sdk_client_input(&allocator, &mut sdk_program, "postRoutes");

        assert!(result.is_ok());

        let expected_code = "const testSdk = sdkClient(schemaValidator, {\n\tuserRoutes: userSdkRouter,\n\tcommentRoutes: commentSdkRouter\n});\n";

        assert_eq!(result.unwrap(), expected_code);
    }

    #[test]
    fn test_successful_deletion_export_const() {
        let allocator = Allocator::default();

        let sdk_code = r#"
        export const testSdk = sdkClient(schemaValidator, {
            userRoutes: userSdkRouter,
            postRoutes: postSdkRouter,
            commentRoutes: commentSdkRouter
        });
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result = delete_from_sdk_client_input(&allocator, &mut sdk_program, "postRoutes");

        assert!(result.is_ok());

        let expected_code = "export const testSdk = sdkClient(schemaValidator, {\n\tuserRoutes: userSdkRouter,\n\tcommentRoutes: commentSdkRouter\n});\n";

        assert_eq!(result.unwrap(), expected_code);
    }

    #[test]
    fn test_rtr_test_deletion() {
        let allocator = Allocator::default();

        let sdk_code = r#"
        import { rtrTestSdkRouter } from './api/routes/rtrTest.routes';
        export const testSdk = sdkClient(schemaValidator, {
            billingPortal: billingPortalSdkRouter,
            checkoutSession: checkoutSessionSdkRouter,
            paymentLink: paymentLinkSdkRouter,
            plan: planSdkRouter,
            subscription: subscriptionSdkRouter,
            rtrTest: rtrTestSdkRouter
        });
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result = delete_from_sdk_client_input(&allocator, &mut sdk_program, "rtrTest");

        assert!(result.is_ok());

        let generated_code = result.unwrap()

        assert!(!generated_code.contains("rtrTest:"));
        assert!(!generated_code.contains("rtrTestSdkRouter"));
        assert!(!generated_code.contains("import { rtrTestSdkRouter }"));
        assert!(!generated_code.contains("./api/routes/rtrTest.routes"));

        assert!(generated_code.contains("export const testSdk"));
        assert!(generated_code.contains("billingPortal:"));
        assert!(generated_code.contains("checkoutSession:"));
        assert!(generated_code.contains("paymentLink:"));
        assert!(generated_code.contains("plan:"));
        assert!(generated_code.contains("subscription:"));
    }
}
