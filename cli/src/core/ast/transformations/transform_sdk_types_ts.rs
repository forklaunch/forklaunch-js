use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    injections::inject_into_sdk_types::inject_into_sdk_types_client_input,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_sdk_types_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_types_path = base_path.join("sdk.types.ts");
    let sdk_types_source_text = read_to_string(&sdk_types_path).unwrap();
    let sdk_types_source_type = SourceType::from_path(&sdk_types_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut sdk_types_program =
        parse_ast_program(&allocator, &sdk_types_source_text, sdk_types_source_type);

    let sdk_client_skeleton_text = format!(
        "export type SdkClientInput = {{ {router_name_camel_case}: typeof {router_name_pascal_case}Routes }}"
    );
    let mut injected_sdk_client_skeleton =
        parse_ast_program(&allocator, &sdk_client_skeleton_text, sdk_types_source_type);

    inject_into_sdk_types_client_input(&mut sdk_types_program, &mut injected_sdk_client_skeleton)?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&sdk_types_program)
        .code)
}
