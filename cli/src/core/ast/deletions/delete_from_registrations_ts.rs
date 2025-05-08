use std::collections::HashSet;

use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{
    Argument, BindingPatternKind, Declaration, Expression, ObjectPropertyKind, Program,
    PropertyKey, Statement,
};

const worker_type_SERVICES: &[&str] = &["WorkerProducer", "WorkerConsumer", "WorkerService"];
const worker_type_PROPERTY_KEYS: &[&str] = &[
    "REDIS_URL",
    "TtlCache",
    "KAFKA_BROKERS",
    "KAFKA_CLIENT_ID",
    "KAFKA_GROUP_ID",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "EntityManager",
];

pub(crate) fn delete_from_registrations_ts_worker_type<'a>(
    allocator: &'a Allocator,
    registrations_program: &mut Program<'a>,
) {
    let mut used_property_keys = HashSet::new();
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

            let call_expression = match &mut expression.declarations[0].init {
                Some(Expression::CallExpression(call)) => call,
                _ => continue,
            };

            for argument in &mut call_expression.arguments {
                let object_expr = match argument {
                    Argument::ObjectExpression(object_expr) => object_expr,
                    _ => continue,
                };

                object_expr.properties.iter().for_each(|prop| {
                    let prop = match prop {
                        ObjectPropertyKind::ObjectProperty(prop) => prop,
                        _ => return,
                    };

                    let inner_object_expr = match &prop.value {
                        Expression::ObjectExpression(object_expr) => object_expr,
                        _ => return,
                    };

                    let factory_prop =
                        match inner_object_expr
                            .properties
                            .iter()
                            .find(|inner_object_prop| {
                                let inner_object_prop = match &inner_object_prop {
                                    ObjectPropertyKind::ObjectProperty(prop) => prop,
                                    _ => return false,
                                };

                                let inner_key = match &inner_object_prop.key {
                                    PropertyKey::StaticIdentifier(identifier) => identifier,
                                    _ => return false,
                                };

                                inner_key.name.as_str() == "factory"
                            }) {
                            Some(factory_prop) => factory_prop,
                            None => return,
                        };

                    match factory_prop {
                        ObjectPropertyKind::ObjectProperty(prop) => {
                            let key = match &prop.key {
                                PropertyKey::StaticIdentifier(identifier) => identifier,
                                _ => return,
                            };

                            if worker_type_SERVICES.contains(&key.name.as_str()) {
                                return;
                            }

                            match &prop.value {
                                Expression::ArrowFunctionExpression(arrow_function_expr) => {
                                    arrow_function_expr.params.items.first().map(|param| {
                                        match &param.pattern.kind {
                                            BindingPatternKind::ObjectPattern(object_pattern) => {
                                                object_pattern.properties.iter().for_each(|prop| {
                                                    let key = match &prop.key {
                                                        PropertyKey::StaticIdentifier(
                                                            identifier,
                                                        ) => identifier,
                                                        _ => return,
                                                    };

                                                    if worker_type_PROPERTY_KEYS
                                                        .contains(&key.name.as_str())
                                                    {
                                                        used_property_keys
                                                            .insert(key.name.as_str());
                                                    }
                                                });
                                            }
                                            _ => return,
                                        }
                                    });
                                }
                                _ => return,
                            }
                        }
                        _ => return,
                    }
                });

                object_expr.properties = Vec::from_iter_in(
                    object_expr
                        .properties
                        .clone_in(allocator)
                        .into_iter()
                        .filter(|prop| {
                            let prop = match prop {
                                ObjectPropertyKind::ObjectProperty(prop) => prop,
                                _ => return true,
                            };

                            let key = match &prop.key {
                                PropertyKey::StaticIdentifier(identifier) => identifier,
                                _ => return true,
                            };

                            if worker_type_PROPERTY_KEYS.contains(&key.name.as_str()) {
                                used_property_keys.contains(&key.name.as_str())
                            } else {
                                true
                            }
                        }),
                    allocator,
                );
            }
        }
    }
}
