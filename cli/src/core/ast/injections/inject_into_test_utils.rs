use std::collections::HashSet;

use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{Argument, Expression, ObjectPropertyKind, Program, PropertyKey, Statement};

use crate::core::ast::parse_ast_program::parse_ast_program;

pub(crate) fn inject_into_test_harness_options<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
    injection_program: &mut Program<'a>,
    option_name: &str,
) -> Result<()> {
    for statement in &mut test_utils_program.body {
        let expression = match statement {
            Statement::VariableDeclaration(expr) => expr,
            _ => continue,
        };

        match expression.declarations[0].id.get_identifier_name() {
            Some(name) if name == "harness" => name,
            _ => continue,
        };

        let call_expression = match &mut expression.declarations[0].init {
            Some(Expression::NewExpression(call)) => call,
            _ => continue,
        };

        let object_expr = match call_expression.arguments.get_mut(0) {
            Some(Argument::ObjectExpression(object_expr)) => object_expr,
            _ => continue,
        };

        let mut property_keys = HashSet::new();
        for prop in &object_expr.properties {
            let prop = match prop {
                ObjectPropertyKind::ObjectProperty(prop) => prop,
                _ => continue,
            };
            let key = match &prop.key {
                PropertyKey::StaticIdentifier(identifier) => identifier,
                _ => continue,
            };
            property_keys.insert(key.name.to_string());
        }

        for injected_stmt in injection_program.body.iter_mut() {
            let injected_var_decl = match injected_stmt {
                Statement::VariableDeclaration(decl) => decl,
                _ => continue,
            };

            for injected_declarator in injected_var_decl.declarations.iter_mut() {
                let injected_new_expr = match &mut injected_declarator.init {
                    Some(Expression::NewExpression(new_expr)) => new_expr,
                    _ => continue,
                };

                let injected_obj = match injected_new_expr.arguments.get_mut(0) {
                    Some(Argument::ObjectExpression(obj)) => obj,
                    _ => continue,
                };

                for injected_prop in injected_obj.properties.iter() {
                    let prop = match injected_prop {
                        ObjectPropertyKind::ObjectProperty(prop) => prop,
                        _ => continue,
                    };

                    let key = match &prop.key {
                        PropertyKey::StaticIdentifier(identifier) => identifier,
                        _ => continue,
                    };

                    if key.name.as_str() == option_name
                        && !property_keys.contains(&key.name.to_string())
                    {
                        object_expr
                            .properties
                            .push(ObjectPropertyKind::ObjectProperty(
                                prop.clone_in(&allocator),
                            ));
                    }
                }

                return Ok(());
            }
        }
    }

    Ok(())
}

pub(crate) fn inject_into_test_harness_custom_env_vars<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
    injection_program: &mut Program<'a>,
    env_var_name: &str,
) -> Result<()> {
    for statement in &mut test_utils_program.body {
        let expression = match statement {
            Statement::VariableDeclaration(expr) => expr,
            _ => continue,
        };

        match expression.declarations[0].id.get_identifier_name() {
            Some(name) if name == "harness" => name,
            _ => continue,
        };

        let call_expression = match &mut expression.declarations[0].init {
            Some(Expression::NewExpression(call)) => call,
            _ => continue,
        };

        let object_expr = match call_expression.arguments.get_mut(0) {
            Some(Argument::ObjectExpression(object_expr)) => object_expr,
            _ => continue,
        };

        let custom_env_vars_prop = object_expr.properties.iter_mut().find(|prop| {
            let prop = match prop {
                ObjectPropertyKind::ObjectProperty(prop) => prop,
                _ => return false,
            };
            let key = match &prop.key {
                PropertyKey::StaticIdentifier(identifier) => identifier,
                _ => return false,
            };
            key.name.as_str() == "customEnvVars"
        });

        let custom_env_vars_obj = match custom_env_vars_prop {
            Some(ObjectPropertyKind::ObjectProperty(prop)) => match &mut prop.value {
                Expression::ObjectExpression(obj) => obj,
                _ => continue,
            },
            _ => {
                let custom_env_vars_text = "const harness = new BlueprintTestHarness({
                    customEnvVars: {}
                });";
                let mut custom_env_vars_program = parse_ast_program(
                    &allocator,
                    custom_env_vars_text,
                    oxc_ast::ast::SourceType::ts(),
                );

                inject_into_test_harness_options(
                    allocator,
                    test_utils_program,
                    &mut custom_env_vars_program,
                    "customEnvVars",
                )?;

                return inject_into_test_harness_custom_env_vars(
                    allocator,
                    test_utils_program,
                    injection_program,
                    env_var_name,
                );
            }
        };

        let mut env_var_keys = HashSet::new();
        for prop in &custom_env_vars_obj.properties {
            let prop = match prop {
                ObjectPropertyKind::ObjectProperty(prop) => prop,
                _ => continue,
            };
            let key = match &prop.key {
                PropertyKey::StaticIdentifier(identifier) => identifier,
                _ => continue,
            };
            env_var_keys.insert(key.name.to_string());
        }

        for injected_stmt in injection_program.body.iter_mut() {
            let injected_var_decl = match injected_stmt {
                Statement::VariableDeclaration(decl) => decl,
                _ => continue,
            };

            for injected_declarator in injected_var_decl.declarations.iter_mut() {
                let injected_new_expr = match &mut injected_declarator.init {
                    Some(Expression::NewExpression(new_expr)) => new_expr,
                    _ => continue,
                };

                let injected_obj = match injected_new_expr.arguments.get_mut(0) {
                    Some(Argument::ObjectExpression(obj)) => obj,
                    _ => continue,
                };

                for injected_harness_prop in injected_obj.properties.iter() {
                    let harness_prop = match injected_harness_prop {
                        ObjectPropertyKind::ObjectProperty(prop) => prop,
                        _ => continue,
                    };

                    let harness_key = match &harness_prop.key {
                        PropertyKey::StaticIdentifier(identifier) => identifier,
                        _ => continue,
                    };

                    if harness_key.name.as_str() != "customEnvVars" {
                        continue;
                    }

                    let injected_env_obj = match &harness_prop.value {
                        Expression::ObjectExpression(obj) => obj,
                        _ => continue,
                    };

                    for injected_env_prop in injected_env_obj.properties.iter() {
                        let env_prop = match injected_env_prop {
                            ObjectPropertyKind::ObjectProperty(prop) => prop,
                            _ => continue,
                        };

                        let env_key = match &env_prop.key {
                            PropertyKey::StaticIdentifier(identifier) => identifier,
                            _ => continue,
                        };

                        if env_key.name.as_str() == env_var_name
                            && !env_var_keys.contains(&env_key.name.to_string())
                        {
                            custom_env_vars_obj.properties.push(
                                ObjectPropertyKind::ObjectProperty(env_prop.clone_in(&allocator)),
                            );
                        }
                    }

                    return Ok(());
                }
            }
        }
    }

    Ok(())
}
