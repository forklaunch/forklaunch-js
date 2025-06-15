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

pub(crate) fn transform_entities_index_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let entities_index_path = base_path
        .join("persistence")
        .join("entities")
        .join("index.ts");
    let entities_index_source_text = read_to_string(&entities_index_path).unwrap();
    let entities_index_source_type = SourceType::from_path(&entities_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut entities_index_program = parse_ast_program(
        &allocator,
        &entities_index_source_text,
        entities_index_source_type,
    );

    let entities_index_text = format!(
        "export {{ {router_name_pascal_case}Record }} from './{router_name_camel_case}Record.entity';",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &entities_index_text, SourceType::ts());

    inject_into_index_ts_export(
        &mut entities_index_program,
        &mut injection_program_ast,
        &router_name_camel_case,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&entities_index_program)
        .code)
}
