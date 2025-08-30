use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    deletions::delete_from_index_ts::delete_from_index_ts_export,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_domain_schemas_index_remove_service_schemas(
    base_path: &Path,
    schema_index_ts_text: Option<&String>,
) -> Result<String> {
    let schema_index_ts_path = base_path.join("domain").join("schemas").join("index.ts");
    let schema_index_ts_source_text = if let Some(schema_index_ts_text) = schema_index_ts_text {
        schema_index_ts_text
    } else {
        &read_to_string(&schema_index_ts_path)?
    };

    let allocator = Allocator::default();

    let mut program = parse_ast_program(&allocator, &schema_index_ts_source_text, SourceType::ts());

    delete_from_index_ts_export(&allocator, &mut program, "service.schemas.ts");

    let codegen_options = CodegenOptions::default();
    let result = Codegen::new().with_options(codegen_options).build(&program);

    Ok(result.code)
}
