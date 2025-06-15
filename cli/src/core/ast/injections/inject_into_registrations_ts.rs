use std::collections::HashSet;

use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{
    Argument, Declaration, Expression, ObjectPropertyKind, Program, PropertyKey, Statement,
};

pub(crate) fn inject_into_registrations_config_injector<'a>(
    allocator: &'a Allocator,
    registrations_program: &mut Program<'a>,
    config_injector_injection: &mut Program<'a>,
    declaration_name: &str,
) -> Result<()> {
    for statement in &mut registrations_program.body {
        let export = match statement {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let function = match &mut export.declaration {
            Some(Declaration::FunctionDeclaration(function)) => function,
            _ => continue,
        };

        let function_body = match &mut function.body {
            Some(body) => body,
            None => continue,
        };

        for statement in function_body.statements.iter_mut() {
            let expression = match statement {
                Statement::VariableDeclaration(expr) => expr,
                _ => continue,
            };

            match expression.declarations[0].id.get_identifier_name() {
                Some(name) => {
                    if name != declaration_name {
                        continue;
                    }
                }
                None => continue,
            }

            let call_expression = match &mut expression.declarations[0].init {
                Some(Expression::CallExpression(call)) => call,
                _ => continue,
            };

            for argument in &mut call_expression.arguments {
                let object_expr = match argument {
                    Argument::ObjectExpression(object_expr) => object_expr,
                    _ => continue,
                };

                let mut property_keys = HashSet::new();
                object_expr.properties.iter().for_each(|prop| {
                    let prop = match prop {
                        ObjectPropertyKind::ObjectProperty(prop) => prop,
                        _ => return,
                    };
                    let key = match &prop.key {
                        PropertyKey::StaticIdentifier(identifier) => identifier,
                        _ => return,
                    };

                    property_keys.insert(key.name.to_string());
                });

                for injected_stmt in config_injector_injection.body.iter_mut() {
                    let injected_var_decl = match injected_stmt {
                        Statement::VariableDeclaration(decl) => decl,
                        _ => continue,
                    };

                    for injected_declarator in injected_var_decl.declarations.iter_mut() {
                        let injected_call_expr = match &mut injected_declarator.init {
                            Some(Expression::CallExpression(call_expr)) => call_expr,
                            _ => continue,
                        };

                        for injected_arg in &mut injected_call_expr.arguments {
                            let injected_obj = match injected_arg {
                                Argument::ObjectExpression(obj) => obj,
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

                                if !property_keys.contains(&key.name.to_string()) {
                                    object_expr.properties.push(
                                        ObjectPropertyKind::ObjectProperty(
                                            prop.clone_in(&allocator),
                                        ),
                                    );
                                }
                            }

                            return Ok(());
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

pub(crate) fn inject_in_registrations_ts_create_dependencies_args<'a>(
    allocator: &'a Allocator,
    create_dependencies_program: &mut Program<'a>,
    registrations_program: &mut Program<'a>,
) -> Result<()> {
    let new_function = create_dependencies_program
        .body
        .first_mut()
        .map(|statement| match statement {
            Statement::ExportNamedDeclaration(export) => match &mut export.declaration {
                Some(Declaration::FunctionDeclaration(function)) => function,
                _ => unreachable!(),
            },
            _ => unreachable!(),
        })
        .unwrap();

    for statement in &mut registrations_program.body {
        let export = match statement {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let function = match &mut export.declaration {
            Some(Declaration::FunctionDeclaration(function)) => function,
            _ => continue,
        };

        let cloned_type_parameters = function.type_parameters.clone_in(allocator);
        let new_type_parameters = new_function.type_parameters.clone_in(allocator);

        if cloned_type_parameters.is_none() {
            function.type_parameters = new_type_parameters;
        } else {
            let params = cloned_type_parameters
                .unwrap()
                .params
                .iter()
                .map(|param| param.name.to_string())
                .collect::<HashSet<String>>();

            for param in new_type_parameters.unwrap().params.iter() {
                if !params.contains(&param.name.to_string()) {
                    function
                        .type_parameters
                        .as_mut()
                        .unwrap()
                        .params
                        .push(param.clone_in(allocator));
                }
            }
        }

        let params = function
            .params
            .items
            .clone_in(allocator)
            .iter()
            .map(|fp| fp.pattern.get_identifier_name().unwrap().to_string())
            .collect::<HashSet<String>>();
        let new_params = new_function.params.items.clone_in(allocator);

        for param in new_params.iter() {
            if !params.contains(&param.pattern.get_identifier_name().unwrap().to_string()) {
                function.params.items.push(param.clone_in(allocator));
            }
        }
    }

    Ok(())
}
