use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    injections::inject_into_index_ts::inject_into_index_ts_export,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_seeders_index_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let seeders_index_path = base_path
        .join("persistence")
        .join("seeders")
        .join("index.ts");
    let seeders_index_source_text = read_to_string(&seeders_index_path).unwrap();
    let seeders_index_source_type = SourceType::from_path(&seeders_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut seeders_index_program = parse_ast_program(
        &allocator,
        &seeders_index_source_text,
        seeders_index_source_type,
    );

    let seeders_index_text = format!(
        "export {{ {router_name_pascal_case}RecordSeeder }} from './{router_name_camel_case}Record.seeder';",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &seeders_index_text, SourceType::ts());

    inject_into_index_ts_export(
        &mut seeders_index_program,
        &mut injection_program_ast,
        &router_name_camel_case,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&seeders_index_program)
        .code)
}
