use std::{fs::read_to_string, path::Path};

use anyhow::{Ok, Result};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::{
    constants::WorkerBackend,
    core::{
        ast::{
            parse_ast_program::parse_ast_program,
            replacements::{
                replace_import_statment::replace_import_statment,
                replace_registration_in_config_injector::replace_registration_in_config_injector,
            },
        },
        worker_backend::{
            get_default_worker_options, get_worker_backend_name, get_worker_consumer_factory,
            get_worker_producer_factory,
        },
    },
};

pub(crate) fn transform_registrations_worker_backend(
    base_path: &Path,
    existing_backend: &WorkerBackend,
    backend: &WorkerBackend,
    registrations_text: Option<String>,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = base_path.join("registration.ts");
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

    let existing_worker_name = get_worker_backend_name(existing_backend);
    let worker_name = get_worker_backend_name(backend);

    let worker_consumer_text = format!(
        "import {{ {}WorkerConsumer }} from @forklaunch/implementation-worker-{}/consumers",
        worker_name,
        worker_name.to_lowercase()
    );
    let mut worker_consumer_import =
        parse_ast_program(&allocator, &worker_consumer_text, SourceType::ts());
    replace_import_statment(
        &mut registration_program,
        &mut worker_consumer_import,
        &format!(
            "@forklaunch/implementation-worker-{}/consumers",
            existing_worker_name.to_lowercase()
        ),
    );

    let worker_producer_text = format!(
        "import {{ {}WorkerProducer }} from @forklaunch/implementation-worker-{}/producers",
        worker_name,
        worker_name.to_lowercase()
    );
    let mut worker_producer_import =
        parse_ast_program(&allocator, &worker_producer_text, SourceType::ts());
    replace_import_statment(
        &mut registration_program,
        &mut worker_producer_import,
        &format!(
            "@forklaunch/implementation-worker-{}/producers",
            existing_worker_name.to_lowercase()
        ),
    );

    let worker_schema_text = format!(
        "import {{ {}WorkerSchemas }} from @forklaunch/implementation-worker-{}/schemas",
        worker_name,
        worker_name.to_lowercase()
    );
    let mut worker_schema_import =
        parse_ast_program(&allocator, &worker_schema_text, SourceType::ts());
    replace_import_statment(
        &mut registration_program,
        &mut worker_schema_import,
        &format!(
            "@forklaunch/implementation-worker-{}/schemas",
            existing_worker_name.to_lowercase()
        ),
    );

    let worker_option_text = format!(
        "import {{ {}WorkerOptions }} from @forklaunch/implementation-worker-{}/types",
        worker_name,
        worker_name.to_lowercase()
    );
    let mut worker_option_import =
        parse_ast_program(&allocator, &worker_option_text, SourceType::ts());
    replace_import_statment(
        &mut registration_program,
        &mut worker_option_import,
        &format!(
            "@forklaunch/implementation-worker-{}/types",
            existing_worker_name.to_lowercase()
        ),
    );

    let config_injector_runtime_dependencies_text = format!(
        "const configInjector = createConfigInjector(configValidator, SchemaValidator(), {{
                WorkerOptions: {{
                    lifetime: Lifetime.Singleton,
                    type: {}WorkerSchemas({{
                        validator: SchemaValidator()
                    }}),
                    value: {}
                }}
            }})",
        worker_name,
        get_default_worker_options(backend)
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
        "const configInjector = createConfigInjector(configValidator, SchemaValidator(), {{
                WorkerProducer: {{
                    lifetime: Lifetime.Singleton,
                    type: {}WorkerProducer,
                    value: {}
                }},
                WorkerConsumer: {{
                    lifetime: Lifetime.Singleton,
                    type: (
                        processEventsFunction: WorkerProcessFunction<{}EventRecord>,
                        failureHandler: WorkerFailureHandler<{}EventRecord>
                    ) => {}WorkerConsumer<{}EventRecord, {}WorkerOptions>,
                    value: {}
                }}
            }})",
        worker_name,
        get_worker_producer_factory(backend),
        worker_name,
        worker_name,
        worker_name,
        worker_name,
        worker_name,
        get_worker_consumer_factory(backend, &worker_name)
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
