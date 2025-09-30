use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{
    BindingPatternKind, Declaration, Expression, ObjectPropertyKind, Program, PropertyKey,
    Statement,
};
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::deletions::delete_import_statement::{
    delete_import_specifier, delete_import_statement,
};

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
            let is_sdk_client_var = matches!(&declarator.id.kind, BindingPatternKind::BindingIdentifier(id) if id.name.ends_with("SdkClient"));
            if !is_sdk_client_var {
                continue;
            }

            let mut maybe_object = None;
            if let Some(init) = &mut declarator.init {
                match init {
                    Expression::ObjectExpression(obj) => {
                        maybe_object = Some(obj);
                    }
                    Expression::TSSatisfiesExpression(ts_sat) => {
                        if let Expression::ObjectExpression(obj) = &mut ts_sat.expression {
                            maybe_object = Some(obj);
                        }
                    }
                    _ => {}
                }
            }
            let object_expr = match maybe_object {
                Some(obj) => obj,
                None => continue,
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

    let _ = delete_import_specifier(
        &allocator,
        sdk_program_ast,
        &format!("{}Get", router_name_camel_case),
        "./api/controllers",
    )?;
    let _ = delete_import_specifier(
        &allocator,
        sdk_program_ast,
        &format!("{}Post", router_name_camel_case),
        "./api/controllers",
    )?;

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
        import { userManagementGet, userManagementPost } from './api/controllers';
        const testSdkClient = {
            userManagement: { userManagementGet: userManagementGet, userManagementPost: userManagementPost },
            comment: { commentGet: commentGet, commentPost: commentPost }
        } satisfies TestSdk;
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result = delete_from_sdk_client_input(&allocator, &mut sdk_program, "userManagement");

        assert!(result.is_ok());

        let generated = result.unwrap();
        assert!(!generated.contains("userManagement:"));
        assert!(!generated.contains("userManagementGet"));
        assert!(!generated.contains("userManagementPost"));
        assert!(generated.contains("comment:"));
    }

    #[test]
    fn test_successful_deletion_export_const() {
        let allocator = Allocator::default();

        let sdk_code = r#"
        import { postGet, postPost } from './api/controllers';
        export const testSdkClient = {
            user: { userGet: userGet, userPost: userPost },
            post: { postGet: postGet, postPost: postPost }
        } satisfies TestSdk;
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result = delete_from_sdk_client_input(&allocator, &mut sdk_program, "post");

        assert!(result.is_ok());

        let generated = result.unwrap();
        assert!(generated.contains("user:"));
        assert!(!generated.contains("post:"));
        assert!(!generated.contains("postGet"));
        assert!(!generated.contains("postPost"));
    }

    #[test]
    fn test_rtr_test_deletion() {
        let allocator = Allocator::default();

        let sdk_code = r#"
        import { rtrTestGet, rtrTestPost } from './api/controllers';
        export const testSdkClient = {
            billingPortal: billingPortal,
            checkoutSession: checkoutSession,
            paymentLink: paymentLink,
            plan: plan,
            subscription: subscription,
            rtrTest: { rtrTestGet: rtrTestGet, rtrTestPost: rtrTestPost }
        } satisfies TestSdk;
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result = delete_from_sdk_client_input(&allocator, &mut sdk_program, "rtrTest");

        assert!(result.is_ok());

        let generated_code = result.unwrap();

        assert!(!generated_code.contains("rtrTest:"));
        assert!(!generated_code.contains("rtrTestGet"));
        assert!(!generated_code.contains("rtrTestPost"));
        assert!(!generated_code.contains("import { rtrTestGet"));

        assert!(generated_code.contains("export const testSdkClient"));
        assert!(generated_code.contains("billingPortal"));
        assert!(generated_code.contains("checkoutSession"));
        assert!(generated_code.contains("paymentLink"));
        assert!(generated_code.contains("plan"));
        assert!(generated_code.contains("subscription"));
    }
}
