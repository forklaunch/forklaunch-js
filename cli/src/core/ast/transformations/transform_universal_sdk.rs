use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    deletions::delete_from_universal_sdk::delete_from_universal_sdk,
    injections::inject_into_universal_sdk::inject_into_universal_sdk,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_universal_sdk_add_sdk(
    base_path: &Path,
    app_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    inject_into_universal_sdk(
        &allocator,
        &mut app_program_ast,
        app_name,
        name,
        &app_program_text,
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_remove_sdk(
    base_path: &Path,
    app_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    delete_from_universal_sdk(&allocator, &mut app_program_ast, app_name, name)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_change_sdk(
    base_path: &Path,
    app_name: &str,
    existing_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    delete_from_universal_sdk(&allocator, &mut app_program_ast, app_name, existing_name)?;
    inject_into_universal_sdk(
        &allocator,
        &mut app_program_ast,
        app_name,
        name,
        &app_program_text,
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}
