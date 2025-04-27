use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    injections::{
        inject_into_import_statement::inject_into_import_statement,
        inject_into_registrations_config_injector::inject_into_registrations_config_injector,
    },
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_registrations_infrastructure_redis_ts(
    base_path: &Path,
    registrations_text: Option<&str>,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = base_path.join("registration.ts");
    let registrations_text = if let Some(registrations_text) = registrations_text {
        registrations_text
    } else {
        &read_to_string(&registrations_path)?
    };

    let registrations_type = SourceType::from_path(&registrations_path)?;

    let mut registrations_program =
        parse_ast_program(&allocator, &registrations_text, registrations_type);

    if !registrations_text.contains("import { RedisTtlCache } from \"@forklaunch/core/cache\";") {
        let import_text = "import { RedisTtlCache } from \"@forklaunch/core/cache\";";

        let mut import_program = parse_ast_program(&allocator, import_text, SourceType::ts());

        inject_into_import_statement(
            &mut registrations_program,
            &mut import_program,
            "@forklaunch/core/cache",
            // "RedisTtlCache",
        );
    }

    if !registrations_text.contains("REDIS_URL: {") {
        let redis_env_var_text =
            "const configInjector = createConfigInjector(configValidator, SchemaValidator(), {
                REDIS_URL: {
                    lifetime: Lifetime.Singleton,
                    type: string,
                    value: getEnvVar('REDIS_URL')
                }
            })";

        let mut redis_env_var_program =
            parse_ast_program(&allocator, &redis_env_var_text, SourceType::ts());

        inject_into_registrations_config_injector(
            &mut registrations_program,
            &mut redis_env_var_program,
            "environmentConfig",
        );
    }

    if !registrations_text.contains("TtlCache: {") {
        let redis_registration_text =
            "const configInjector = createConfigInjector(configValidator, SchemaValidator(), {
                TtlCache: {
                    lifetime: Lifetime.Singleton,
                    type: RedisTtlCache,
                    factory: ({ REDIS_URL, OpenTelemetryCollector }) =>
                        new RedisTtlCache(60 * 60 * 1000, OpenTelemetryCollector, {
                            url: REDIS_URL,
                        }, {
                            enabled: true,
                            level: \"info\",
                        }),
                }
            })";

        let mut redis_registration_program =
            parse_ast_program(&allocator, &redis_registration_text, SourceType::ts());

        inject_into_registrations_config_injector(
            &mut registrations_program,
            &mut redis_registration_program,
            "runtimeDependencies",
        );
    }

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}
