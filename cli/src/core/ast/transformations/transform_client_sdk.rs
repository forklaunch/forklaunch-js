use std::path::Path;

use anyhow::{Context, Result};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;

use crate::{
    constants::error_failed_to_read_file,
    core::{
        ast::{
            deletions::delete_from_client_sdk::delete_from_client_sdk,
            injections::inject_into_client_sdk::{ClientSdkSpecialCase, inject_into_client_sdk},
            parse_ast_program::parse_ast_program,
            write_ast_program::write_ast_program,
        },
        rendered_template::RenderedTemplatesCache,
    },
};

pub(crate) fn transform_client_sdk_add_sdk_with_special_case(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    name: &str,
    special_case: Option<ClientSdkSpecialCase>,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("client-sdk").join("clientSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = &template.content;
    let mut app_program_ast = parse_ast_program(&allocator, app_program_text, SourceType::ts());

    inject_into_client_sdk(
        &allocator,
        &mut app_program_ast,
        app_name,
        name,
        &app_program_text,
        special_case,
    )?;

    Ok(write_ast_program(&app_program_ast))
}

pub(crate) fn transform_client_sdk_remove_sdk(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("client-sdk").join("clientSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = &template.content;
    let mut app_program_ast = parse_ast_program(&allocator, app_program_text, SourceType::ts());

    delete_from_client_sdk(&allocator, &mut app_program_ast, app_name, name)?;

    Ok(write_ast_program(&app_program_ast))
}

pub(crate) fn transform_client_sdk_change_sdk(
    rendered_templates_cache: &RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    existing_name: &str,
    name: &str,
) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_ts_path = base_path.join("client-sdk").join("clientSdk.ts");
    let template = rendered_templates_cache
        .get(&sdk_ts_path)?
        .context(error_failed_to_read_file(&sdk_ts_path))?;
    let app_program_text = &template.content;
    let mut app_program_ast = parse_ast_program(&allocator, app_program_text, SourceType::ts());

    delete_from_client_sdk(&allocator, &mut app_program_ast, app_name, existing_name)?;
    inject_into_client_sdk(
        &allocator,
        &mut app_program_ast,
        app_name,
        name,
        app_program_text,
        None,
    )?;

    Ok(write_ast_program(&app_program_ast))
}
