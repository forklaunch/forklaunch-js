use std::{path::Path, fs::read_to_string, io::Write};

use anyhow::{Context, Result};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_READ_MANIFEST, ERROR_FAILED_TO_PARSE_MANIFEST},
    core::{manifest::{InitializableManifestConfig, InitializableManifestConfigMetadata, ManifestData, ProjectType, add_project_definition_to_manifest, library::LibraryManifestData}, name::validate_name},
    prompt::{ArrayCompleter, prompt_with_validation},
};




pub(crate) fn add_library_to_manifest(library_name: &str, app_root_path: &Path, modules_path: &Path, manifest_data: &mut ApplicationManifestData, rendered_templates: &mut Vec<RenderedTemplate>, stdout: &mut StandardStream) -> Result<()> {
    let mut line_editor = Editor::<(), DefaultHistory>::new()?;
    let project_type = ProjectType::Library;
    let mut manifest_data: LibraryManifestData = LibraryManifestData {
        // Common fields from ApplicationManifestData
        id: manifest_data.id.clone(),
        app_name: manifest_data.app_name.clone(),
        modules_path: manifest_data.modules_path.clone(),
        docker_compose_path: manifest_data.docker_compose_path.clone(),
        camel_case_app_name: manifest_data.camel_case_app_name.clone(),
        pascal_case_app_name: manifest_data.pascal_case_app_name.clone(),
        kebab_case_app_name: manifest_data.kebab_case_app_name.clone(),
        app_description: manifest_data.app_description.clone(),
        author: manifest_data.author.clone(),
        cli_version: manifest_data.cli_version.clone(),
        formatter: manifest_data.formatter.clone(),
        linter: manifest_data.linter.clone(),
        validator: manifest_data.validator.clone(),
        runtime: manifest_data.runtime.clone(),
        test_framework: manifest_data.test_framework.clone(),
        projects: manifest_data.projects.clone(),
        http_framework: manifest_data.http_framework.clone(),
        license: manifest_data.license.clone(),
        project_peer_topology: manifest_data.project_peer_topology.clone(),
        is_biome: manifest_data.is_biome,
        is_eslint: manifest_data.is_eslint,
        is_oxlint: manifest_data.is_oxlint,
        is_prettier: manifest_data.is_prettier,
        is_express: manifest_data.is_express,
        is_hyper_express: manifest_data.is_hyper_express,
        is_zod: manifest_data.is_zod,
        is_typebox: manifest_data.is_typebox,
        is_bun: manifest_data.is_bun,
        is_node: manifest_data.is_node,
        is_vitest: manifest_data.is_vitest,
        is_jest: manifest_data.is_jest,

        // Library-specific fields
        library_name: library_name.clone(),
        camel_case_name: library_name.to_case(Case::Camel),
        kebab_case_name: library_name.to_case(Case::Kebab),
        description: description.clone(),
    };
    Ok(())
}

pub(crate) fn add_worker_to_manifest(worker_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, rendered_templates: &mut Vec<RenderedTemplate>, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}

pub(crate) fn add_module_to_manifest(module_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, rendered_templates: &mut Vec<RenderedTemplate>, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}

pub(crate) fn add_router_to_manifest(router_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, rendered_templates: &mut Vec<RenderedTemplate>, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}