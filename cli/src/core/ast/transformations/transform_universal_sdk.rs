use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    deletions::delete_from_universal_sdk::delete_from_universal_sdk,
    injections::inject_into_universal_sdk::inject_into_universal_sdk,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_universal_sdk_add_sdk(
    base_path: &Path,
    kebab_app_name: &str,
    camel_case_name: &str,
    pascal_case_name: &str,
    kebab_case_name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    inject_into_universal_sdk(
        &allocator,
        &mut app_program_ast,
        kebab_app_name,
        camel_case_name,
        pascal_case_name,
        kebab_case_name,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_remove_sdk(
    base_path: &Path,
    kebab_app_name: &str,
    camel_case_name: &str,
    kebab_case_name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    delete_from_universal_sdk(
        &allocator,
        &mut app_program_ast,
        kebab_app_name,
        camel_case_name,
        kebab_case_name,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_change_sdk(
    base_path: &Path,
    kebab_app_name: &str,
    camel_case_name: &str,
    pascal_case_name: &str,
    kebab_case_name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    delete_from_universal_sdk(
        &allocator,
        &mut app_program_ast,
        kebab_app_name,
        camel_case_name,
        kebab_case_name,
    )?;

    inject_into_universal_sdk(
        &allocator,
        &mut app_program_ast,
        kebab_app_name,
        camel_case_name,
        pascal_case_name,
        kebab_case_name,
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}
