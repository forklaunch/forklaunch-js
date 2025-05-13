use std::{cell::Cell, path::Path};

use anyhow::Result;
use fs_extra::file::read_to_string;
use oxc_allocator::{Allocator, Box, CloneIn, Vec};
use oxc_ast::ast::{
    Argument, Declaration, Expression, IdentifierReference, SourceType, Span, Statement,
};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    parse_ast_program::parse_ast_program,
    replacements::replace_import_statment::replace_import_statment,
};

pub(crate) fn transform_bootstrapper_ts_database_dependency_injection(
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();

    let bootstrapper_path = base_path.join("bootstrapper.ts");
    let bootstrapper_text = read_to_string(&bootstrapper_path)?;

    let mut bootstrapper_program = parse_ast_program(
        &allocator,
        &bootstrapper_text,
        SourceType::from_path(&bootstrapper_path)?,
    );

    let mut mikro_orm_import_program = parse_ast_program(
        &allocator,
        "import { MikroORM } from '@mikro-orm/core';",
        SourceType::ts(),
    );
    replace_import_statment(
        &mut bootstrapper_program,
        &mut mikro_orm_import_program,
        "@mikro-orm/core",
    )?;

    let mut mikro_orm_config_import_program = parse_ast_program(
        &allocator,
        "import mikroOrmOptionsConfig from './mikro-orm.config';",
        SourceType::ts(),
    );
    replace_import_statment(
        &mut bootstrapper_program,
        &mut mikro_orm_config_import_program,
        "./mikro-orm.config",
    )?;

    let mut database_dependency_program = parse_ast_program(
        &allocator,
        "MikroORM.init(mikroOrmOptionsConfig).then((orm) => {});",
        SourceType::ts(),
    );

    for statement in bootstrapper_program.body.iter_mut() {
        let export = match statement {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let export_function = match export.declaration.as_mut().unwrap() {
            Declaration::FunctionDeclaration(function) => function,
            _ => continue,
        };

        let mut outer_statements = Vec::new_in(&allocator);
        let mut inner_statements = Vec::new_in(&allocator);
        let mut is_inner = false;

        for statement in export_function.body.as_mut().unwrap().statements.iter_mut() {
            let mut set_inner_after_add = false;
            match statement {
                Statement::VariableDeclaration(variable_declaration) => {
                    for declaration in variable_declaration.declarations.iter_mut() {
                        if let Some(init) = &mut declaration.init {
                            if let Expression::CallExpression(call_expression) = init {
                                match &mut call_expression.callee {
                                    Expression::Identifier(identifier) => {
                                        if identifier.name == "createDependencies" {
                                            if !call_expression.arguments.iter().any(|argument| {
                                                if let Argument::Identifier(identifier) = argument {
                                                    identifier.name.to_string() == "orm"
                                                } else {
                                                    false
                                                }
                                            }) {
                                                call_expression.arguments.push(
                                                    Argument::Identifier(Box::new_in(
                                                        IdentifierReference {
                                                            span: Span::default(),
                                                            name: "orm".into(),
                                                            reference_id: Cell::new(None),
                                                        },
                                                        &allocator,
                                                    )),
                                                );
                                            };
                                        }
                                    }
                                    _ => continue,
                                }
                            }
                        }
                    }
                }
                Statement::ExpressionStatement(expression) => match &expression.expression {
                    Expression::CallExpression(call_expression) => match &call_expression.callee {
                        Expression::StaticMemberExpression(static_member_expression) => {
                            match &static_member_expression.object {
                                Expression::Identifier(identifier) => {
                                    if identifier.name == "dotenv"
                                        && static_member_expression.property.name == "config"
                                    {
                                        set_inner_after_add = true;
                                    }
                                }
                                Expression::CallExpression(inner_call_expression) => {
                                    match &inner_call_expression.callee {
                                        Expression::StaticMemberExpression(
                                            inner_static_member_expression,
                                        ) => match &inner_static_member_expression.object {
                                            Expression::Identifier(inner_identifier) => {
                                                if inner_identifier.name == "MikroORM"
                                                    && inner_static_member_expression.property.name
                                                        == "init"
                                                {
                                                    return Ok(CodeGenerator::new()
                                                        .with_options(CodegenOptions::default())
                                                        .build(&bootstrapper_program)
                                                        .code);
                                                }
                                            }
                                            _ => continue,
                                        },
                                        _ => continue,
                                    }
                                }
                                _ => continue,
                            };
                        }
                        _ => {}
                    },
                    _ => {}
                },
                _ => {}
            };

            if is_inner {
                inner_statements.push(statement.clone_in(&allocator));
            } else {
                outer_statements.push(statement.clone_in(&allocator));
            }

            if set_inner_after_add {
                is_inner = true;
            }
        }

        let database_dependency_program_body =
            database_dependency_program.body.first_mut().unwrap();

        let database_dependency_expression = match database_dependency_program_body {
            Statement::ExpressionStatement(expression) => expression,
            _ => unreachable!(),
        };

        let database_dependency_call_expression =
            match &mut database_dependency_expression.expression {
                Expression::CallExpression(call_expression) => call_expression,
                _ => unreachable!(),
            };

        match database_dependency_call_expression
            .arguments
            .first_mut()
            .unwrap()
        {
            Argument::ArrowFunctionExpression(arrow_function_expression) => {
                arrow_function_expression
                    .body
                    .statements
                    .extend(inner_statements);
            }
            _ => unreachable!(),
        }

        outer_statements.extend(database_dependency_program.body.clone_in(&allocator));
        export_function.as_mut().body.as_mut().unwrap().statements = outer_statements;
    }
    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&bootstrapper_program)
        .code)
}
