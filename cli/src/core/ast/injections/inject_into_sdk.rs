use anyhow::{Result, bail};
use oxc_ast::ast::{Declaration, Expression, Program, Statement};

pub(crate) fn inject_into_sdk_client_input<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
) -> Result<()> {
    for stmt in app_program_ast.body.iter_mut() {
        let var_declaration = match stmt {
            Statement::VariableDeclaration(decl) => decl,
            Statement::ExportNamedDeclaration(export) => match &mut export.declaration {
                Some(Declaration::VariableDeclaration(decl)) => decl,
                _ => continue,
            },
            _ => continue,
        };

        // Check if this is a sdkClient declaration
        let is_sdk_client = var_declaration.declarations.iter().any(|decl| {
            if let Some(Expression::CallExpression(call)) = &decl.init {
                if let Expression::Identifier(ident) = &call.callee {
                    return ident.name == "sdkClient";
                }
            }
            false
        });

        if !is_sdk_client {
            continue;
        }

        // Find the object argument in the sdkClient call
        for decl in &mut var_declaration.declarations {
            if let Some(Expression::CallExpression(call)) = &mut decl.init {
                if call.arguments.len() >= 2 {
                    let object_arg = &mut call.arguments[1];
                    if let oxc_ast::ast::Argument::ObjectExpression(app_object) = object_arg {
                        // Process injection
                        for injection_stmt in &mut injection_program_ast.body {
                            let injection_var_decl = match injection_stmt {
                                Statement::VariableDeclaration(decl) => decl,
                                Statement::ExportNamedDeclaration(export) => {
                                    match &mut export.declaration {
                                        Some(Declaration::VariableDeclaration(decl)) => decl,
                                        _ => continue,
                                    }
                                }
                                _ => continue,
                            };

                            // Check if this is also a sdkClient declaration
                            let is_injection_sdk_client =
                                injection_var_decl.declarations.iter().any(|decl| {
                                    if let Some(Expression::CallExpression(call)) = &decl.init {
                                        if let Expression::Identifier(ident) = &call.callee {
                                            return ident.name == "sdkClient";
                                        }
                                    }
                                    false
                                });

                            if !is_injection_sdk_client {
                                continue;
                            }

                            // Find the object argument in the injection sdkClient call
                            for injection_decl in &mut injection_var_decl.declarations {
                                if let Some(Expression::CallExpression(injection_call)) =
                                    &mut injection_decl.init
                                {
                                    if injection_call.arguments.len() >= 2 {
                                        let injection_object_arg = &mut injection_call.arguments[1];
                                        if let oxc_ast::ast::Argument::ObjectExpression(
                                            injection_object,
                                        ) = injection_object_arg
                                        {
                                            // Merge the properties from injection into app
                                            app_object
                                                .properties
                                                .extend(injection_object.properties.drain(..));
                                            return Ok(());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    bail!("Failed to inject into export declaration");
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;
    use oxc_codegen::{CodeGenerator, CodegenOptions};

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    #[test]
    fn test_successful_injection() {
        let allocator = Allocator::default();

        let app_code = r#"
        export const sdkClient = sdkClient(schemaValidator, {
            mySdkClientRoutes: mySdkClientSdkRouter
        });
        "#;
        let mut app_program = parse_ast_program(&allocator, app_code, SourceType::ts());

        let injection_code = r#"
        export const sdkClient = sdkClient(schemaValidator, {
            mySdkClient2Routes: mySdkClient2SdkRouter
        });
        "#;
        let mut injection_program = parse_ast_program(&allocator, injection_code, SourceType::ts());

        let result = inject_into_sdk_client_input(&mut app_program, &mut injection_program);

        assert!(result.is_ok());

        let expected_code = "export const sdkClient = sdkClient(schemaValidator, {\n\tmySdkClientRoutes: mySdkClientSdkRouter,\n\tmySdkClient2Routes: mySdkClient2SdkRouter\n});\n";

        assert_eq!(
            CodeGenerator::new()
                .with_options(CodegenOptions::default())
                .build(&app_program)
                .code,
            expected_code
        );
    }
}
