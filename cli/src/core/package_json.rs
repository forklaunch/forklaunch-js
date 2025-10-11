use std::{fs::read_to_string, path::Path};

use anyhow::{Context, Result, bail};
use application_package_json::ApplicationPackageJson;
use ramhorns::{Content, Template};
use serde::Serialize;
use serde_json::{from_str, to_string_pretty};

use super::{
    manifest::{InitializableManifestConfig, ManifestData},
    pnpm_workspace::PnpmWorkspace,
    rendered_template::{RenderedTemplate, RenderedTemplatesCache},
};
use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON, ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
        ERROR_FAILED_TO_READ_PACKAGE_JSON, ERROR_FAILED_TO_UPDATE_APPLICATION_PACKAGE_JSON,
        ERROR_UNSUPPORTED_DATABASE, Runtime,
    },
    core::manifest::{ManifestConfig, ProjectManifestConfig},
};

pub(crate) mod application_package_json;
pub(crate) mod package_json_constants;
pub(crate) mod project_package_json;

pub(crate) fn add_project_definition_to_package_json<
    T: Content + ManifestConfig + ProjectManifestConfig + InitializableManifestConfig + Serialize,
>(
    base_path: &Path,
    manifest_data: &T,
) -> Result<String> {
    let mut full_package_json: ApplicationPackageJson = from_str(
        &read_to_string(base_path.join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    if let Some(workspaces) = full_package_json.workspaces.as_mut() {
        if !workspaces.contains(&manifest_data.name()) {
            workspaces.push(manifest_data.name().clone());
        }
    }

    Ok(Template::new(
        to_string_pretty(&full_package_json)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?
            .as_str(),
    )?
    .render(&manifest_data))
}

pub(crate) fn update_application_package_json(
    manifest_data: &ManifestData,
    base_path: &Path,
    existing_package_json: Option<String>,
) -> Result<Option<RenderedTemplate>> {
    let mut full_package_json: ApplicationPackageJson = from_str(
        &existing_package_json.unwrap_or(
            read_to_string(base_path.join("package.json"))
                .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
        ),
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    if let ManifestData::Worker(worker_data) = manifest_data {
        if !worker_data.is_database_enabled {
            return Ok(Some(RenderedTemplate {
                path: base_path.join("package.json"),
                content: to_string_pretty(&full_package_json)?,
                context: Some(ERROR_FAILED_TO_UPDATE_APPLICATION_PACKAGE_JSON.to_string()),
            }));
        }
    }

    let scripts = full_package_json.scripts.as_mut().unwrap();

    let database = match manifest_data {
        ManifestData::Service(service_data) => service_data.database.to_string(),
        ManifestData::Worker(worker_data) => worker_data.database.clone().unwrap(),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let is_mongo = match manifest_data {
        ManifestData::Service(service_data) => service_data.is_mongo,
        ManifestData::Worker(worker_data) => worker_data.is_mongo,
        _ => false,
    };

    let update_docker_cmd = |cmd: &str| {
        let (docker_cmd, rest_cmd) = match cmd.split_once("&&") {
            Some((docker, rest)) => (docker.trim(), rest.trim()),
            None => (cmd.trim(), ""),
        };

        let mut services: Vec<&str> = docker_cmd
            .split("-d")
            .skip(1) // Skip the "docker compose up --watch" part
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .collect();

        if !services.contains(&database.as_str()) {
            services.push(&database);
            if is_mongo {
                services.push("mongo-init");
            }
        }

        let new_docker_cmd = format!(
            "docker compose up {}",
            services
                .iter()
                .map(|svc| format!("-d {}", svc))
                .collect::<Vec<_>>()
                .join(" ")
        );

        if rest_cmd.is_empty() {
            new_docker_cmd
        } else {
            format!("{} && {}", new_docker_cmd, rest_cmd)
        }
    };

    if let Some(init_script) = &scripts.migrate_init {
        scripts.migrate_init = Some(update_docker_cmd(&init_script));
    }

    if let Some(create_script) = &scripts.migrate_create {
        scripts.migrate_create = Some(update_docker_cmd(&create_script));
    }

    if let Some(up_script) = &scripts.migrate_up {
        scripts.migrate_up = Some(update_docker_cmd(&up_script));
    }

    if let Some(down_script) = &scripts.migrate_down {
        scripts.migrate_down = Some(update_docker_cmd(&down_script));
    }

    if let Some(seed_script) = &scripts.seed {
        scripts.seed = Some(update_docker_cmd(&seed_script));
    }

    Ok(Some(RenderedTemplate {
        path: base_path.join("package.json"),
        content: to_string_pretty(&full_package_json)?,
        context: Some(ERROR_FAILED_TO_UPDATE_APPLICATION_PACKAGE_JSON.to_string()),
    }))
}

pub(crate) fn replace_project_in_workspace_definition(
    application_base_path: &Path,
    application_package_json: &mut ApplicationPackageJson,
    runtime: &Runtime,
    existing_project_name: &str,
    new_project_name: &str,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<()> {
    match runtime {
        Runtime::Bun => {
            if let Some(workspaces) = application_package_json.workspaces.as_mut() {
                workspaces.remove(
                    workspaces
                        .iter()
                        .position(|name| name == existing_project_name)
                        .unwrap(),
                );
                workspaces.push(new_project_name.to_string());
            }
        }
        Runtime::Node => {
            let workspace_definition = rendered_templates_cache
                .get(Path::new(application_base_path).join("pnpm-workspace.yaml"))?
                .unwrap()
                .content;

            let mut workspace_definition: PnpmWorkspace =
                serde_yml::from_str(&workspace_definition)
                    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

            workspace_definition.packages.remove(
                workspace_definition
                    .packages
                    .iter()
                    .position(|name| name == existing_project_name)
                    .unwrap(),
            );

            workspace_definition
                .packages
                .push(new_project_name.to_string());

            rendered_templates_cache.insert(
                application_base_path
                    .join("pnpm-workspace.yaml")
                    .to_string_lossy(),
                RenderedTemplate {
                    path: application_base_path.join("pnpm-workspace.yaml"),
                    content: serde_yml::to_string(&workspace_definition)?,
                    context: None,
                },
            );
        }
    }

    Ok(())
}

pub(crate) fn remove_project_definition_to_package_json(
    base_path: &Path,
    project_name: &str,
) -> Result<String> {
    let mut full_package_json: ApplicationPackageJson = from_str(
        &read_to_string(base_path.join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    if let Some(workspaces) = full_package_json.workspaces.as_mut() {
        if let Some(position) = workspaces.iter().position(|name| name == project_name) {
            workspaces.remove(position);
        }
    }

    Ok(to_string_pretty(&full_package_json)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?)
}

pub(crate) fn remove_project_definition_from_package_json(
    package_json: &mut ApplicationPackageJson,
    project_name: &str,
) -> Result<ApplicationPackageJson> {
    if let Some(workspaces) = package_json.workspaces.as_mut() {
        if let Some(position) = workspaces.iter().position(|name| name == project_name) {
            workspaces.remove(position);
        }
    }
    Ok(package_json.clone())
}

pub(crate) fn add_project_definition_to_package_json_mut(
    package_json: &mut ApplicationPackageJson,
    project_name: &str,
) -> Result<ApplicationPackageJson> {
    if let Some(workspaces) = package_json.workspaces.as_mut() {
        if !workspaces.contains(&project_name.to_string()) {
            workspaces.push(project_name.to_string().clone());
        }
    }
    Ok(package_json.clone())
}