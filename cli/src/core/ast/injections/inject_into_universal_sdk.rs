use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::{
    BindingPatternKind, Declaration, Expression, Program, SourceType, Statement, TSType,
};

use crate::core::ast::{
    injections::inject_into_import_statement::inject_into_import_statement,
    parse_ast_program::parse_ast_program,
};

fn inject_into_universal_sdk_function<'a>(
    allocator: &'a Allocator,
    app_program_ast: &mut Program<'a>,
    camel_case_name: &str,
    pascal_case_name: &str,
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
                                let param_text = format!(
                                    "const func = ({{ {}Host }}: {{ {}Host: string }}) => {{}};",
                                    camel_case_name, camel_case_name
                                );
                                let mut param_program = parse_ast_program(
                                    allocator,
                                    allocator.alloc_str(&param_text),
                                    SourceType::ts(),
                                );

                                if let Some(Statement::VariableDeclaration(var_decl)) =
                                    param_program.body.first_mut()
                                {
                                    if let Some(declarator) = var_decl.declarations.first_mut() {
                                        if let Some(Expression::ArrowFunctionExpression(arrow)) =
                                            &mut declarator.init
                                        {
                                            if let Some(param) = arrow.params.items.first_mut() {
                                                if let BindingPatternKind::ObjectPattern(
                                                    temp_pattern,
                                                ) = &mut param.pattern.kind
                                                {
                                                    if let Some(property) =
                                                        temp_pattern.properties.pop()
                                                    {
                                                        obj_pattern.properties.push(property);
                                                    }
                                                }

                                                if let Some(type_annotation) =
                                                    &mut param.pattern.type_annotation
                                                {
                                                    if let TSType::TSTypeLiteral(
                                                        type_literal_inner,
                                                    ) = &mut type_annotation.type_annotation
                                                    {
                                                        type_literal.members.push(
                                                            type_literal_inner
                                                                .members
                                                                .pop()
                                                                .unwrap(),
                                                        )
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

                if let Some(return_type) = &mut arrow_func.return_type {
                    if let TSType::TSTypeReference(type_ref) = &mut return_type.type_annotation {
                        if let Some(type_params) = &mut type_ref.type_arguments {
                            if let Some(TSType::TSTypeLiteral(promise_type_literal)) =
                                type_params.params.first_mut()
                            {
                                let return_type_text = format!(
                                    "type ReturnType = {{ {}: {}SdkClient }};",
                                    camel_case_name, pascal_case_name
                                );
                                let mut return_type_program = parse_ast_program(
                                    allocator,
                                    allocator.alloc_str(&return_type_text),
                                    SourceType::ts(),
                                );

                                if let Some(Statement::TSTypeAliasDeclaration(type_alias)) =
                                    return_type_program.body.first_mut()
                                {
                                    if let TSType::TSTypeLiteral(type_literal) =
                                        &mut type_alias.type_annotation
                                    {
                                        if let Some(member) = type_literal.members.pop() {
                                            promise_type_literal.members.push(member);
                                        }
                                    }
                                }
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
                            let return_prop_text = format!(
                                "const obj = {{ {}: await universalSdk<{}SdkClient>({{ host: {}Host, registryOptions: {{ path: \"api/v1/openapi\" }} }}) }};",
                                camel_case_name, pascal_case_name, camel_case_name
                            );
                            let mut return_prop_program = parse_ast_program(
                                allocator,
                                allocator.alloc_str(&return_prop_text),
                                SourceType::ts(),
                            );

                            if let Some(Statement::VariableDeclaration(var_decl)) =
                                return_prop_program.body.first_mut()
                            {
                                if let Some(declarator) = var_decl.declarations.first_mut() {
                                    if let Some(Expression::ObjectExpression(temp_obj)) =
                                        &mut declarator.init
                                    {
                                        if let Some(property) = temp_obj.properties.pop() {
                                            return_obj.properties.push(property);
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

    Ok(())
}

pub(crate) fn inject_into_universal_sdk<'a>(
    allocator: &'a Allocator,
    app_program_ast: &mut Program<'a>,
    app_name: &str,
    name: &str,
    source_text: &str,
) -> Result<()> {
    let kebab_app_name = &app_name.to_case(Case::Kebab);
    let camel_case_name = &name.to_case(Case::Camel);
    let pascal_case_name = &name.to_case(Case::Pascal);
    let kebab_case_name = &name.to_case(Case::Kebab);

    let import_text = format!(
        "import type {{ {}SdkClient }} from \"@{}/{}\";",
        pascal_case_name, kebab_app_name, kebab_case_name
    );
    let mut import_program = parse_ast_program(
        allocator,
        allocator.alloc_str(&import_text),
        SourceType::ts(),
    );

    inject_into_import_statement(
        app_program_ast,
        &mut import_program,
        &format!("@{kebab_app_name}/{kebab_case_name}"),
        source_text,
    )?;
    inject_into_universal_sdk_function(
        allocator,
        app_program_ast,
        camel_case_name,
        pascal_case_name,
    )?;

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
    fn test_inject_into_universal_sdk_function() {
        let allocator = Allocator::default();

        let app_code = r#"
        export const universalSdk = ({ }: { }): Promise<{ }> => ({
        });
        "#;
        let mut app_program = parse_ast_program(&allocator, app_code, SourceType::ts());

        let result = inject_into_universal_sdk_function(
            &allocator,
            &mut app_program,
            "userService",
            "UserService",
        );

        assert!(result.is_ok());

        let expected_code = "export const universalSdk = ({ userServiceHost }: {\n\tuserServiceHost: string;\n}): Promise<{\n\tuserService: UserServiceSdkClient;\n}> => ({ userService: await universalSdk<UserServiceSdkClient>({\n\thost: userServiceHost,\n\tregistryOptions: { path: \"api/v1/openapi\" }\n}) });\n";

        assert_eq!(
            Codegen::new()
                .with_options(CodegenOptions::default())
                .build(&app_program)
                .code,
            expected_code
        );
    }
}
