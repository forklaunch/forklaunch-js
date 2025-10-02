use std::path::Path;

use anyhow::Result;
use serde_yml::to_string;
use crate::core::{manifest::{ManifestData, ServiceManifestData}, docker::{add_base_definition_to_docker_compose, add_database_to_docker_compose, add_redis_to_docker_compose, add_s3_to_docker_compose, create_base_service, get_relative_context_path}, docker::DockerCompose};

pub(crate) fn add_package_to_artifact(
    manifest_data: &mut ManifestData,
    modules_path: &Path,
    artifact_type: &str,
    package_type: &str,
    runtime: &str,
    dir_project_names_set: &HashSet<String>,
    rendered_templates: &mut Vec<RenderedTemplate>,
    stdout: &mut StandardStream,
) -> Result<()> {
    match package_type {
        InitializeType::Service => {
            match artifact_type {
                "manifest" => {
                    let (new_manifest_projects, forklaunch_manifest_buffer) = add_service_to_manifest_with_validation(manifest_data, modules_path, dir_project_names_set, stdout)?;
                    if new_manifest_projects.contains(&service_name) {
                        rendered_templates.push(RenderedTemplate {
                            path: app_root_path.join(".forklaunch").join("manifest.toml"),
                            content: forklaunch_manifest_buffer,
                            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST.to_string()),
                        });
                    }
                }
                "docker_compose" => {
                    let (new_docker_services, docker_compose_buffer) = add_service_to_docker_compose_with_validation(manifest_data, modules_path, dir_project_names_set, stdout)?;
                    if new_docker_services.contains(&service_name) {
                        rendered_templates.push(RenderedTemplate {
                            path: modules_path.join("docker-compose.yaml"),
                            content: docker_compose_buffer,
                            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE.to_string()),
                        });
                    }
                }
                "runtime" => {
                    let (new_runtime_projects, package_json_buffer, pnpm_workspace_buffer) = add_service_to_runtime_files_with_validation(manifest_data, modules_path, dir_project_names_set, stdout)?;
                    if new_runtime_projects.contains(&service_name) {
                        rendered_templates.push(
                            update_application_package_json(
                                &ManifestData::Service(manifest_data),
                                modules_path,
                                package_json_buffer,
                            )?
                            .unwrap(),
                    ); 

                    if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
                        rendered_templates.push(RenderedTemplate {
                            path: modules_path.join("pnpm-workspace.yaml"),
                            content: pnpm_workspace_buffer,
                            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE.to_string()),
                        });
                    }
                }
                "sdk" => {
                    add_project_to_universal_sdk(
                        &mut rendered_templates, 
                        &modules_path, 
                        &manifest_data.app_name, 
                        &manifest_data.service_name, 
                        None)?;
                }
            }
        }
    }
        
    Ok(())
}