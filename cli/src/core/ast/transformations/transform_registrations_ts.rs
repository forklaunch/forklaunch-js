use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
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

pub(crate) fn transform_registrations_ts(
    router_name: &str,
    is_worker: bool,
    is_cache_enabled: bool,
    base_path: &String,
) -> Result<String> {
    let allocator = Allocator::default();
    let registrations_path = Path::new(base_path).join("registrations.ts");
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
        // "/services",
        // format!("Base{router_name_pascal_case}Service").as_str(),
    )?;

    let config_injector_text = format!(
        "const configInjector = createConfigInjector(configValidator, SchemaValidator(), {{
            {router_name_pascal_case}Service: {{
            lifetime: Lifetime.Scoped,
            type: Base{router_name_pascal_case}Service,
            factory: (
                {{ {}, OpenTelemetryCollector }},
                resolve,
                context
            ) => {{
                let em = EntityManager;
                if (context.entityManagerOptions) {{
                    em = resolve('EntityManager', context);
                }}
                return new Base{router_name_pascal_case}Service(
                    {},
                    OpenTelemetryCollector
                );
            }}
            }}
        }})",
        if is_worker && is_cache_enabled {
            "TtlCache"
        } else {
            "EntityManager"
        },
        if is_worker && is_cache_enabled {
            "TtlCache"
        } else {
            "em"
        }
    );

    let mut config_injector_injection =
        parse_ast_program(&allocator, &config_injector_text, registrations_source_type);

    inject_into_registrations_config_injector(
        &mut registrations_program,
        &mut config_injector_injection,
        "serviceDependencies",
    );

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&registrations_program)
        .code)
}
