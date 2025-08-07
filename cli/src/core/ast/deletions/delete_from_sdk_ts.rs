use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{Argument, Expression, ObjectPropertyKind, Program, PropertyKey, Statement};
use oxc_codegen::{Codegen, CodegenOptions};

use super::delete_import_statement::delete_import_specifier;

pub(crate) fn delete_from_sdk_client_input<'a>(
    allocator: &'a Allocator,
    sdk_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<String> {
    for stmt in sdk_program_ast.body.iter_mut() {
        let var_decl = match stmt {
            Statement::VariableDeclaration(var_decl) => var_decl,
            _ => continue,
        };

        // Find the sdkClient call
        for declarator in &mut var_decl.declarations {
            let call_expr = match &mut declarator.init {
                Some(Expression::CallExpression(call)) => call,
                _ => continue,
            };

            // Check if this is the sdkClient call
            let callee = match &call_expr.callee {
                Expression::Identifier(ident) => ident,
                _ => continue,
            };

            if callee.name != "sdkClient" {
                continue;
            }

            // Look for the object literal in the arguments
            for argument in &mut call_expr.arguments {
                let object_expr = match argument {
                    Argument::ObjectExpression(object_expr) => object_expr,
                    _ => continue,
                };

                // Remove the property that matches the router name
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

                    // Remove the property that matches the router name (e.g., "postRoutes")
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

    let _ = delete_import_specifier(
        &allocator,
        sdk_program_ast,
        &format!("{}Routes", router_name_camel_case),
        "./server",
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
    fn test_successful_deletion() {
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
}
