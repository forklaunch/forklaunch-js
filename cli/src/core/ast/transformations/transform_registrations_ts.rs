use std::{fs::read_to_string, path::Path};

use anyhow::{Ok, Result};
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::{
    constants::WorkerType,
    core::{
        ast::{
            deletions::delete_from_registrations_ts::delete_from_registrations_ts_worker_type,
            infrastructure::{
                database::database_entity_manager_runtime_dependency,
                kafka::kafka_url_environment_variable,
                redis::{
                    redis_import, redis_ttl_cache_runtime_dependency,
                    redis_url_environment_variable,
                },
                s3::{s3_import, s3_object_store_runtime_dependency, s3_url_environment_variable},
            },
            injections::{
                inject_into_import_statement::{
                    inject_into_import_statement, inject_specifier_into_import_statement,
                },
                inject_into_registrations_ts::{
                    inject_in_registrations_ts_create_dependencies_args,
                    inject_into_registrations_config_injector,
                },
            },
            parse_ast_program::parse_ast_program,
            replacements::{
                replace_import_statment::replace_import_statment,
                replace_in_registrations_ts::replace_registration_in_config_injector,
            },
        },
        manifest::ProjectType,
        worker_type::{
            get_default_worker_options, get_worker_consumer_factory, get_worker_producer_factory,
            get_worker_type_name,
        },
    },
};

pub(crate) fn transform_registrations_ts_add_router(
    router_name: &str,
    project_type: &ProjectType,
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = base_path.join("registrations.ts");
    let registrations_source_text = read_to_string(&registrations_path).unwrap();
    let registrations_source_type = SourceType::from_path(&registrations_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut registrations_program = parse_ast_program(
        &allocator,
        &registrations_source_text,
        registrations_source_type,
    );

    let forklaunch_routes_import_text = format!(
        "import {{ Base{router_name_pascal_case}Service }} from './services/{router_name_camel_case}.service';",
    );
    let mut forklaunch_routes_import_injection = parse_ast_program(
        &allocator,
        &forklaunch_routes_import_text,
        registrations_source_type,
    );

    inject_into_import_statement(
        &mut registrations_program,
        &mut forklaunch_routes_import_injection,
        format!("./services/{router_name_camel_case}.service").as_str(),
    )?;

    let (dependency, em_setup, em_resolution, service_param) = match project_type {
        ProjectType::Worker => ("WorkerProducer", "", "", "WorkerProducer"),
        ProjectType::Service => (
            "EntityManager",
            "resolve,",
            "let em = EntityManager;
              if (context.entityManagerOptions) {
                em = resolve('EntityManager', context);
              }",
            "em",
        ),
        _ => unreachable!(),
    };

    let config_injector_text = format!(
        "const configInjector = createConfigInjector(SchemaValidator(), {{
            {router_name_pascal_case}Service: {{
            lifetime: Lifetime.Scoped,
            type: Base{router_name_pascal_case}Service,
            factory: (
                {{ {dependency}, OpenTelemetryCollector }}, 
                {em_setup}
                context
            ) => {{ 
                {em_resolution}
                return new Base{router_name_pascal_case}Service(
                    {service_param},
                    OpenTelemetryCollector
                );
            }}
            }}
        }})"
    );

    let mut config_injector_injection =
        parse_ast_program(&allocator, &config_injector_text, registrations_source_type);

    inject_into_registrations_config_injector(
        &allocator,
        &mut registrations_program,
        &mut config_injector_injection,
        "serviceDependencies",
    );

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn transform_registrations_ts_infrastructure_redis(
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

    redis_import(&allocator, &registrations_text, &mut registrations_program);
    redis_url_environment_variable(&allocator, &mut registrations_program);
    redis_ttl_cache_runtime_dependency(&allocator, &mut registrations_program);

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn transform_registrations_ts_infrastructure_s3(
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

    s3_import(&allocator, &registrations_text, &mut registrations_program);
    s3_url_environment_variable(&allocator, &mut registrations_program);
    s3_object_store_runtime_dependency(&allocator, &mut registrations_program);

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}

pub(crate) fn transform_registrations_ts_worker_type(
    base_path: &Path,
    app_name: &str,
    pascal_case_name: &str,
    existing_type: &WorkerType,
    r#type: &WorkerType,
    registrations_text: Option<String>,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = base_path.join("registrations.ts");
    let registrations_text = if let Some(registrations_text) = registrations_text {
        registrations_text
    } else {
        read_to_string(&registrations_path)?
    };

    let mut registration_program = parse_ast_program(
        &allocator,
        &registrations_text,
        SourceType::from_path(registrations_path)?,
    );

    let existing_worker_type = get_worker_type_name(existing_type);
    let worker_type = get_worker_type_name(r#type);

    let worker_consumer_text = format!(
        "import {{ {}WorkerConsumer }} from '@forklaunch/implementation-worker-{}/consumers'",
        worker_type,
        worker_type.to_lowercase()
    );
    let mut worker_consumer_import =
        parse_ast_program(&allocator, &worker_consumer_text, SourceType::ts());
    let _ = replace_import_statment(
        &mut registration_program,
        &mut worker_consumer_import,
        &format!(
            "@forklaunch/implementation-worker-{}/consumers",
            existing_worker_type.to_lowercase()
        ),
    );

    let worker_producer_text = format!(
        "import {{ {}WorkerProducer }} from '@forklaunch/implementation-worker-{}/producers'",
        worker_type,
        worker_type.to_lowercase()
    );
    let mut worker_producer_import =
        parse_ast_program(&allocator, &worker_producer_text, SourceType::ts());
    let _ = replace_import_statment(
        &mut registration_program,
        &mut worker_producer_import,
        &format!(
            "@forklaunch/implementation-worker-{}/producers",
            existing_worker_type.to_lowercase()
        ),
    );

    let worker_schema_text = format!(
        "import {{ {}WorkerSchemas }} from '@forklaunch/implementation-worker-{}/schemas'",
        worker_type,
        worker_type.to_lowercase()
    );
    let mut worker_schema_import =
        parse_ast_program(&allocator, &worker_schema_text, SourceType::ts());
    let _ = replace_import_statment(
        &mut registration_program,
        &mut worker_schema_import,
        &format!(
            "@forklaunch/implementation-worker-{}/schemas",
            existing_worker_type.to_lowercase()
        ),
    );

    let worker_option_text = format!(
        "import {{ {}WorkerOptions }} from '@forklaunch/implementation-worker-{}/types'",
        worker_type,
        worker_type.to_lowercase()
    );
    let mut worker_option_import =
        parse_ast_program(&allocator, &worker_option_text, SourceType::ts());
    let _ = replace_import_statment(
        &mut registration_program,
        &mut worker_option_import,
        &format!(
            "@forklaunch/implementation-worker-{}/types",
            existing_worker_type.to_lowercase()
        ),
    );

    delete_from_registrations_ts_worker_type(&allocator, &mut registration_program);

    match r#type {
        WorkerType::BullMQCache => {
            redis_import(&allocator, &registrations_text, &mut registration_program);
            redis_url_environment_variable(&allocator, &mut registration_program);
        }
        WorkerType::RedisCache => {
            redis_import(&allocator, &registrations_text, &mut registration_program);
            redis_url_environment_variable(&allocator, &mut registration_program);
            redis_ttl_cache_runtime_dependency(&allocator, &mut registration_program);
        }
        WorkerType::Database => {
            let mut mikro_orm_import_program = parse_ast_program(
                &allocator,
                "import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';",
                SourceType::ts(),
            );
            replace_import_statment(
                &mut registration_program,
                &mut mikro_orm_import_program,
                "@mikro-orm/core",
            )?;
            let mut create_dependencies_program = parse_ast_program(
                &allocator,
                "export function createDependencies(orm: MikroORM) {}",
                SourceType::ts(),
            );
            inject_in_registrations_ts_create_dependencies_args(
                &allocator,
                &mut create_dependencies_program,
                &mut registration_program,
            );
            database_entity_manager_runtime_dependency(&allocator, &mut registration_program);
        }
        WorkerType::Kafka => {
            inject_specifier_into_import_statement(
                &allocator,
                &mut registration_program,
                "array",
                &format!("@{app_name}/core"),
            )?;
            kafka_url_environment_variable(&allocator, &mut registration_program);
        }
    }

    let config_injector_runtime_dependencies_text = format!(
        "const configInjector = createConfigInjector(SchemaValidator(), {{
                WorkerOptions: {{
                    lifetime: Lifetime.Singleton,
                    type: {}WorkerSchemas({{
                        validator: SchemaValidator()
                    }}),
                    {}
                }}
            }});",
        worker_type,
        get_default_worker_options(r#type)
    );
    let mut config_injector_runtime_dependencies_import = parse_ast_program(
        &allocator,
        &config_injector_runtime_dependencies_text,
        SourceType::ts(),
    );
    replace_registration_in_config_injector(
        &allocator,
        &mut registration_program,
        &mut config_injector_runtime_dependencies_import,
        "runtimeDependencies",
    );

    let config_injector_service_dependencies_text = format!(
        "const configInjector = createConfigInjector(SchemaValidator(), {{
                WorkerProducer: {{
                    lifetime: Lifetime.Scoped,
                    type: {}WorkerProducer,
                    factory: {}
                }},
                WorkerConsumer: {{
                    lifetime: Lifetime.Scoped,
                    type: (
                        processEventsFunction: WorkerProcessFunction<{}EventRecord>,
                        failureHandler: WorkerFailureHandler<{}EventRecord>
                    ) => {}WorkerConsumer<{}EventRecord, {}WorkerOptions>,
                    factory: {}
                }}
            }})",
        worker_type,
        get_worker_producer_factory(r#type),
        pascal_case_name,
        pascal_case_name,
        worker_type,
        pascal_case_name,
        worker_type,
        get_worker_consumer_factory(r#type, &pascal_case_name)
    );
    let mut config_injector_service_dependencies_import = parse_ast_program(
        &allocator,
        &config_injector_service_dependencies_text,
        SourceType::ts(),
    );
    replace_registration_in_config_injector(
        &allocator,
        &mut registration_program,
        &mut config_injector_service_dependencies_import,
        "serviceDependencies",
    );

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registration_program)
        .code)
}
