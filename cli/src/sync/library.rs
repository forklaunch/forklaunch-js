use std::{path::Path, 
    collections::HashSet};

use convert_case::{Case, Casing};
use anyhow::{Context, Result};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{StandardStream};
use clap::ArgMatches;

use crate::{
    // CliCommand,
    constants::{
        Runtime,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
    },
    core::{
        manifest::{
            ProjectType, 
            application::ApplicationManifestData,
            add_project_definition_to_manifest, 
            library::LibraryManifestData
        },
        package_json::{add_project_definition_to_package_json},
        pnpm_workspace::{add_project_definition_to_pnpm_workspace},
    },
    prompt::{ArrayCompleter, prompt_without_validation},
    sync::{constants::{DIRS_TO_IGNORE,
        RUNTIME_PROJECTS_TO_IGNORE},
        utils::validate_addition_to_artifact,
    },
};

pub(crate) fn add_library_to_manifest_with_validation(
    manifest_data: &mut LibraryManifestData,
    stdout: &mut StandardStream,
) -> Result<String> {
    let forklaunch_manifest_buffer = add_project_definition_to_manifest(
        ProjectType::Library,
        manifest_data,
        None,
        None,
        None,
        None,
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;
    let library_name = manifest_data.library_name.clone();
    let new_manifest_projects: HashSet<String> = manifest_data.projects
        .iter()
        .map(|project| project.name.clone())
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    
    let validation_result = validate_addition_to_artifact(
        &library_name,
        &new_manifest_projects,
        &format!("Successfully added {} to manifest.toml", library_name),
        &format!("Library {} was not added to manifest.toml", library_name),
        "sync:library:55",
        stdout,
    )?;
    if validation_result {
        Ok(forklaunch_manifest_buffer)
    } else {
        return Err(anyhow::anyhow!("Failed to add {} to manifest.toml", library_name))
    }
}

pub(crate) fn add_library_to_runtime_files_with_validation(
    manifest_data: &mut LibraryManifestData,
    base_path: &Path,
    stdout: &mut StandardStream,
) -> Result<(Option<String>, Option<String>)> {
    let runtime = manifest_data.runtime.parse()?;

    let mut package_json_buffer: Option<String> = None;
    let mut pnpm_workspace_buffer: Option<String> = None;

    match runtime {
        Runtime::Bun => {
            package_json_buffer = Some(
                add_project_definition_to_package_json(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
            );
            let new_package_json_projects: HashSet<String> = package_json_buffer.iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
            let validation_result = validate_addition_to_artifact(
                &manifest_data.library_name,
                &new_package_json_projects,
                &format!("Successfully added {} to package.json", manifest_data.library_name),
                &format!("Library {} was not added to package.json", manifest_data.library_name),
                "sync:library:86",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to package.json", manifest_data.library_name))
            }
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
            let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace_buffer.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            let validation_result = validate_addition_to_artifact(
                &manifest_data.library_name,
                &new_pnpm_workspace_projects,
                &format!("Successfully added {} to pnpm-workspace.yaml", manifest_data.library_name),
                &format!("Library {} was not added to pnpm-workspace.yaml", manifest_data.library_name),
                "sync:library:95",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", manifest_data.library_name))
            }
        }
    }
    Ok((package_json_buffer, pnpm_workspace_buffer))
}

pub(crate) fn sync_library_setup(
    library_name: &str,
    manifest_data: &mut ApplicationManifestData,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
) -> Result<LibraryManifestData> {
    let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;

    let description = prompt_without_validation(
        &mut line_editor,
        stdout,
        "description",
        matches,
        "library description (optional)",
        None,
    )?;

    let manifest_data: LibraryManifestData = LibraryManifestData {
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
            library_name: library_name.clone().to_string(),
            camel_case_name: library_name.to_case(Case::Camel),
            kebab_case_name: library_name.to_case(Case::Kebab),
            description: description.clone(),
        };

    Ok(manifest_data)
}