use anyhow::Result;
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
                                "const obj = {{ {}: await universalSdk<{}ApiClient>({{ host: {}Host, registryOptions: {{ path: \"api/v1/openapi\" }} }}) }};",
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
    kebab_app_name: &str,
    camel_case_name: &str,
    pascal_case_name: &str,
    kebab_case_name: &str,
) -> Result<()> {
    let import_text = format!(
        "import type {{ {}ApiClient }} from \"@{}/{}\";",
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
    )?;
    inject_into_universal_sdk_function(
        allocator,
        app_program_ast,
        camel_case_name,
        pascal_case_name,
    )?;

    Ok(())
}
