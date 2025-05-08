use std::collections::HashSet;

use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{
    Argument, Declaration, Expression, ObjectPropertyKind, Program, PropertyKey, Statement,
};

pub(crate) fn inject_into_registrations_config_injector<'a>(
    allocator: &'a Allocator,
    registrations_program: &mut Program<'a>,
    config_injector_injection: &mut Program<'a>,
    declaration_name: &str,
) {
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
                        // let injected_new_expr = match &mut injected_declarator.init {
                        //     Some(Expression::NewExpression(new_expr)) => new_expr,
                        //     _ => continue,
                        // };
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

                            return;
                        }
                    }
                }
            }
        }
    }
}
