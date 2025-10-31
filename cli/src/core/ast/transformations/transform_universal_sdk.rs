use std::path::Path;

use anyhow::{Context, Result};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::{
    constants::error_failed_to_read_file,
    core::{
        ast::{
            deletions::delete_from_universal_sdk::delete_from_universal_sdk,
            injections::inject_into_universal_sdk::{
                UniversalSdkSpecialCase, inject_into_universal_sdk,
            },
            parse_ast_program::parse_ast_program,
            replacements::replace_in_universal_sdk::{
                replace_sdk_client_import_sources_generated, replace_sdk_client_import_sources_live,
            },
        },
        rendered_template::RenderedTemplatesCache,
    },
};

pub(crate) fn transform_universal_sdk_add_sdk_with_special_case(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    name: &str,
    special_case: Option<UniversalSdkSpecialCase>,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("universal-sdk").join("universalSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = template.content;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    inject_into_universal_sdk(
        &allocator,
        &mut app_program_ast,
        app_name,
        name,
        &app_program_text,
        special_case,
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_remove_sdk(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("universal-sdk").join("universalSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = template.content;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    delete_from_universal_sdk(&allocator, &mut app_program_ast, app_name, name)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_change_sdk(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    existing_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("universal-sdk").join("universalSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = template.content;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    delete_from_universal_sdk(&allocator, &mut app_program_ast, app_name, existing_name)?;
    inject_into_universal_sdk(
        &allocator,
        &mut app_program_ast,
        app_name,
        name,
        &app_program_text,
        None,
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_use_generated_path(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("universal-sdk").join("universalSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = template.content;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    replace_sdk_client_import_sources_generated(&allocator, &mut app_program_ast)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}

pub(crate) fn transform_universal_sdk_use_live_sdk(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("universal-sdk").join("universalSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = template.content;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());

    replace_sdk_client_import_sources_live(&allocator, &mut app_program_ast)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code)
}
