use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{
    BindingPatternKind, Declaration, Expression, ObjectPropertyKind, Program, Statement,
    TSSignature, TSType,
};

use crate::core::ast::deletions::delete_import_statement::delete_import_statement;

fn delete_from_universal_sdk_function<'a>(
    allocator: &'a Allocator,
    app_program_ast: &mut Program<'a>,
    camel_case_name: &str,
) -> Result<()> {
    for stmt in app_program_ast.body.iter_mut() {
        let export = match stmt {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let var_decl = match &mut export.declaration {
            Some(Declaration::VariableDeclaration(var_decl)) => var_decl,
            _ => continue,
        };

        if let Some(declarator) = var_decl.declarations.first_mut() {
            if let Some(arrow_func) = declarator.init.as_mut().and_then(|init| match init {
                Expression::ArrowFunctionExpression(arrow) => Some(arrow),
                _ => None,
            }) {
                if let Some(param) = arrow_func.params.items.first_mut() {
                    if let BindingPatternKind::ObjectPattern(obj_pattern) = &mut param.pattern.kind
                    {
                        if let Some(type_annotation) = &mut param.pattern.type_annotation {
                            if let TSType::TSTypeLiteral(type_literal) =
                                &mut type_annotation.type_annotation
                            {
                                let host_param_name = format!("{}Host", camel_case_name);

                                let mut new_properties = Vec::new_in(allocator);
                                obj_pattern.properties.iter().for_each(|prop| {
                                    if let Some(prop_name) = prop.key.name() {
                                        if prop_name == host_param_name {
                                            return;
                                        }
                                    }

                                    new_properties.push(prop.clone_in(allocator));
                                });

                                let mut new_type_literal_members = Vec::new_in(allocator);
                                type_literal.members.iter().for_each(|member| {
                                    match member {
                                        TSSignature::TSPropertySignature(prop) => {
                                            if let Some(prop_name) = prop.key.name() {
                                                if prop_name == host_param_name {
                                                    return;
                                                }
                                                new_type_literal_members
                                                    .push(member.clone_in(allocator))
                                            }
                                        }
                                        _ => return,
                                    };
                                });

                                obj_pattern.properties = new_properties;
                                type_literal.members = new_type_literal_members;
                            }
                        }
                    }
                }

                if let Some(return_type) = &mut arrow_func.return_type {
                    if let TSType::TSTypeReference(type_ref) = &mut return_type.type_annotation {
                        if let Some(type_params) = &mut type_ref.type_arguments {
                            if let Some(TSType::TSTypeLiteral(promise_type_literal)) =
                                type_params.params.first_mut()
                            {
                                let mut new_promise_members = Vec::new_in(allocator);
                                promise_type_literal.members.iter().for_each(|member| {
                                    match member {
                                        TSSignature::TSPropertySignature(prop) => {
                                            if let Some(prop_name) = prop.key.name() {
                                                if prop_name == camel_case_name {
                                                    return;
                                                }
                                                new_promise_members
                                                    .push(member.clone_in(allocator));
                                            }
                                        }
                                        _ => {
                                            new_promise_members.push(member.clone_in(allocator));
                                        }
                                    };
                                });
                                promise_type_literal.members = new_promise_members;
                            }
                        }
                    }
                }

                if let Some(Statement::ExpressionStatement(return_stmt)) =
                    arrow_func.body.as_mut().statements.first_mut()
                {
                    if let Expression::ParenthesizedExpression(parenthesized_expr) =
                        &mut return_stmt.expression
                    {
                        if let Expression::ObjectExpression(return_obj) =
                            &mut parenthesized_expr.expression
                        {
                            let mut new_properties = Vec::new_in(allocator);
                            return_obj.properties.iter().for_each(|prop| {
                                let prop_key = match prop {
                                    ObjectPropertyKind::ObjectProperty(obj_prop) => &obj_prop.key,
                                    _ => return,
                                };

                                if let Some(prop_name) = prop_key.name() {
                                    if prop_name == camel_case_name {
                                        return;
                                    }
                                }

                                new_properties.push(prop.clone_in(allocator));
                            });

                            return_obj.properties = new_properties;
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

pub(crate) fn delete_from_universal_sdk<'a>(
    allocator: &'a Allocator,
    app_program_ast: &mut Program<'a>,
    app_name: &str,
    name: &str,
) -> Result<()> {
    let kebab_app_name = &app_name.to_case(Case::Kebab);
    let camel_case_name = &name.to_case(Case::Camel);
    let kebab_case_name = &name.to_case(Case::Kebab);

    let import_source = format!("@{}/{}", kebab_app_name, kebab_case_name);

    delete_import_statement(allocator, app_program_ast, &import_source)?;
    delete_from_universal_sdk_function(allocator, app_program_ast, camel_case_name)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;
    use oxc_codegen::{Codegen, CodegenOptions};

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    #[test]
    fn test_delete_from_universal_sdk_function() {
        let allocator = Allocator::default();

        let app_code = r#"
        export const universalSdk = ({ userServiceHost, otherServiceHost }: {
            userServiceHost: string
            otherServiceHost: string
        }): Promise<{
            userService: UserServiceSdkClient
            otherService: OtherServiceSdkClient
        }> => ({
            userService: await universalSdk<UserServiceSdkClient>({
                host: userServiceHost,
                registryOptions: { path: "api/v1/openapi" }
            }),
            otherService: await universalSdk<OtherServiceSdkClient>({
                host: otherServiceHost,
                registryOptions: { path: "api/v1/openapi" }
            })
        });
        "#;
        let mut app_program = parse_ast_program(&allocator, app_code, SourceType::ts());

        let result =
            delete_from_universal_sdk_function(&allocator, &mut app_program, "userService");

        assert!(result.is_ok());

        let expected_code = "export const universalSdk = ({ otherServiceHost }: {\n\totherServiceHost: string;\n}): Promise<{\n\totherService: OtherServiceSdkClient;\n}> => ({ otherService: await universalSdk<OtherServiceSdkClient>({\n\thost: otherServiceHost,\n\tregistryOptions: { path: \"api/v1/openapi\" }\n}) });\n";

        assert_eq!(
            Codegen::new()
                .with_options(CodegenOptions::default())
                .build(&app_program)
                .code,
            expected_code
        );
    }
}
