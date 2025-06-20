use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::{
    VisitMut,
    ast::{
        Argument, BindingPatternKind, Declaration, Expression, ObjectPropertyKind, Program,
        PropertyKey, SourceType, Statement, VariableDeclarator,
    },
};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    infrastructure::{
        redis::{
            delete_redis_import, delete_redis_ttl_cache_runtime_dependency,
            delete_redis_url_environment_variable,
        },
        s3::{
            delete_s3_import, delete_s3_object_store_runtime_dependency,
            delete_s3_url_environment_variable,
        },
    },
    parse_ast_program::parse_ast_program,
};

const WORKER_TYPE_SERVICES: &[&str] = &["WorkerProducer", "WorkerConsumer", "WorkerService"];
const WORKER_TYPE_PROPERTY_KEYS: &[&str] = &[
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

                            if WORKER_TYPE_SERVICES.contains(&key.name.as_str()) {
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

                                                    if WORKER_TYPE_PROPERTY_KEYS
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

                            if WORKER_TYPE_PROPERTY_KEYS.contains(&key.name.as_str()) {
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

pub(crate) fn delete_from_registrations_ts_infrastructure_redis(
    base_path: &Path,
    registrations_text: Option<String>,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = base_path.join("registrations.ts");
    let registrations_text = if let Some(registrations_text) = registrations_text {
        registrations_text
    } else {
        read_to_string(&registrations_path)?
    };

    let registrations_type = SourceType::from_path(&registrations_path)?;

    let mut registrations_program =
        parse_ast_program(&allocator, &registrations_text, registrations_type);

    delete_redis_import(&allocator, &mut registrations_program);
    delete_redis_url_environment_variable(&allocator, &mut registrations_program);
    delete_redis_ttl_cache_runtime_dependency(&allocator, &mut registrations_program);

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn delete_from_registrations_ts_infrastructure_s3(
    base_path: &Path,
    registrations_text: Option<String>,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = base_path.join("registrations.ts");
    let registrations_text = if let Some(registrations_text) = registrations_text {
        registrations_text
    } else {
        read_to_string(&registrations_path)?
    };

    let registrations_type = SourceType::from_path(&registrations_path)?;

    let mut registrations_program =
        parse_ast_program(&allocator, &registrations_text, registrations_type);

    delete_s3_import(&allocator, &mut registrations_program);
    delete_s3_url_environment_variable(&allocator, &mut registrations_program);
    delete_s3_object_store_runtime_dependency(&allocator, &mut registrations_program);

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn delete_from_registrations_ts_config_injector<'a>(
    allocator: &'a Allocator,
    registrations_program: &mut Program<'a>,
    key_name: &str,
    declaration_name: &str,
) -> Result<String> {
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

                    if key.name.as_str() != key_name {
                        new_properties.push(ObjectPropertyKind::ObjectProperty(
                            prop.clone_in(&allocator),
                        ));
                    }
                });
                object_expr.properties = new_properties;
            }
        }
    }

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn delete_from_registration_schema_validators<'a>(
    allocator: &'a Allocator,
    program: &mut Program<'a>,
) {
    struct ValidatorRemover<'a> {
        allocator: &'a Allocator,
    }

    impl<'a> VisitMut<'a> for ValidatorRemover<'a> {
        fn visit_variable_declarator(&mut self, declarator: &mut VariableDeclarator<'a>) {
            if let Some(Expression::CallExpression(call_expr)) = &mut declarator.init {
                if let Some(first_arg) = call_expr.arguments.first_mut() {
                    if let Argument::ObjectExpression(obj_expr) = first_arg {
                        obj_expr.properties.retain(|prop| match prop {
                            ObjectPropertyKind::ObjectProperty(obj_prop) => match &obj_prop.key {
                                PropertyKey::StaticIdentifier(ident) => ident.name != "validator",
                                PropertyKey::StringLiteral(str_lit) => str_lit.value != "validator",
                                _ => true,
                            },
                            _ => true,
                        });

                        if obj_expr.properties.is_empty() {
                            call_expr.arguments.clear();
                            declarator.init = Some(call_expr.callee.clone_in(self.allocator));
                        }
                    }
                }
            }

            self.visit_variable_declarator_impl(declarator);
        }
    }

    impl<'a> ValidatorRemover<'a> {
        fn visit_variable_declarator_impl(&mut self, declarator: &mut VariableDeclarator<'a>) {
            self.visit_binding_pattern(&mut declarator.id);
            if let Some(init) = &mut declarator.init {
                self.visit_expression(init);
            }
        }
    }

    let mut visitor = ValidatorRemover { allocator };
    visitor.visit_program(program);
}
