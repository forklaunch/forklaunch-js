use std::{path::Path, collections::{HashSet, HashMap}, io::Write, fs::read_to_string};

use anyhow::Result;
use clap::ArgMatches;
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};
use serde_json::{from_str as json_from_str, to_string_pretty as json_to_string_pretty};
use serde_yml::to_string as yaml_to_string;
use derive_more::From;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;

use crate::{
    constants::{InitializeType, Runtime},
    core::{
        manifest::{application::ApplicationManifestData, ProjectType, remove_project_definition_from_manifest}, 
        docker::{DockerCompose, remove_service_from_docker_compose, remove_worker_from_docker_compose},
        package_json::{application_package_json::ApplicationPackageJson, project_package_json::ProjectPackageJson, add_project_definition_to_package_json_mut, remove_project_definition_from_package_json},
        pnpm_workspace::{PnpmWorkspace, add_project_definition_to_pnpm_workspace_mut, remove_project_definition_from_pnpm_workspace},
        universal_sdk::{read_universal_sdk_content, add_project_vec_to_universal_sdk, remove_project_vec_from_universal_sdk},
        ast::{parse_ast_program::parse_ast_program, validation::analyze_project_references_against_target},
    },
    sync::{
        constants::{RUNTIME_PROJECTS_TO_IGNORE, DIRS_TO_IGNORE, DOCKER_SERVICES_TO_IGNORE},
        service::{sync_service_setup, add_service_to_manifest_with_validation, add_service_to_docker_compose_with_validation}, 
        library::{sync_library_setup, add_library_to_manifest_with_validation}, 
        module::{sync_module_setup, add_module_to_manifest_with_validation, add_module_to_docker_compose_with_validation}, 
        router::{sync_router_setup, add_router_to_manifest_with_validation, add_router_server_with_validation, add_router_sdk_with_validation, add_router_registrations_with_validation, add_router_persistence_with_validation, add_router_controllers_with_validation}, 
        worker::{sync_worker_setup, add_worker_to_manifest_with_validation, add_worker_to_docker_compose_with_validation},
    },
};

#[derive(Clone, Debug, From)]
pub enum ArtifactResult {
    String(String),
    ProjectType(ProjectType),
    Manifest(ApplicationManifestData),
    DockerCompose(DockerCompose),
    PackageJson(ApplicationPackageJson),
    PnpmWorkspace(PnpmWorkspace),
    USdkJson(ProjectPackageJson),
    OptionString(Option<String>),
}

pub(crate) fn add_package_to_artifact(
    package_name: &str,
    manifest_data: &mut ApplicationManifestData,
    app_root_path: &Path,
    modules_path: &Path,
    artifact_type: &str,
    package_type: &InitializeType,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
    docker_compose: Option<&mut DockerCompose>, //optional
    pnpm_workspace: Option<&mut PnpmWorkspace>, //optional
    package_json: Option<&mut ApplicationPackageJson>, //optional
    usdk_ast_program_text: Option<&mut String>, //optional
    usdk_json: Option<&mut String>, //optional
    _project_type: Option<ProjectType>, //optional
    _service_name: Option<String>, //optional
    prompts_map: &HashMap<String, HashMap<String, String>>, //optional
) -> Result<HashMap<String, ArtifactResult>> {
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
    writeln!(stdout, "Adding package {} to artifact: {}", package_name, artifact_type)?;
    stdout.reset()?;
    let mut results = HashMap::new();
    match package_type {
        InitializeType::Service => {
            let mut service_manifest_data = sync_service_setup(
                &package_name, 
                &modules_path, 
                manifest_data, 
                stdout, 
                matches,
                prompts_map)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_service_to_manifest_with_validation(&mut service_manifest_data, stdout)?;
                    results.insert("manifest".to_string(), ArtifactResult::String(forklaunch_manifest_buffer));
                }
                "docker_compose" => {
                    if let Some(docker_compose) = docker_compose {
                        let docker_compose_buffer = add_service_to_docker_compose_with_validation(&mut service_manifest_data, app_root_path, &yaml_to_string(&docker_compose)?, stdout)?;
                        results.insert("docker_compose".to_string(), ArtifactResult::String(docker_compose_buffer));
                    } else {
                        return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
                    }
                }
                "runtime" => {
                    let runtime = manifest_data.runtime.parse()?;
                    match runtime {
                        Runtime::Bun => {
                            if let Some(package_json) = package_json {
                                add_project_definition_to_package_json_mut(
                                    package_json,
                                    &package_name,)?;
                                let new_package_json_projects: HashSet<String> = package_json.workspaces
                                    .as_ref()
                                    .unwrap_or(&Vec::new())
                                    .iter()
                                    .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                                    .cloned()
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_package_json_projects,
                                    &format!("Successfully added {} to package.json", package_name),
                                    &format!("Service {} was not added to package.json", package_name),
                                    "sync:utils:93",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to package.json", package_name));
                                }
                                let application_package_json_buffer = json_to_string_pretty(&package_json)?;
                                results.insert("package_json".to_string(), ArtifactResult::String(application_package_json_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Package.json data is required for Bun runtime."));
                            }
                        }
                        Runtime::Node => {
                            if let Some(pnpm_workspace) = pnpm_workspace {
                                add_project_definition_to_pnpm_workspace_mut(
                                    pnpm_workspace, &package_name)?;
                                let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages
                                    .iter()
                                    .filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str()))
                                    .cloned()
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_pnpm_workspace_projects,
                                    &format!("Successfully added {} to pnpm-workspace.yaml", package_name),
                                    &format!("Service {} was not added to pnpm-workspace.yaml", package_name),
                                    "sync:utils:111",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", package_name));
                                }
                                let application_pnpm_workspace_buffer = yaml_to_string(&pnpm_workspace)?;
                                results.insert("pnpm_workspace".to_string(), ArtifactResult::String(application_pnpm_workspace_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Pnpm workspace data is required for Node runtime."));
                            }
                        }
                    }
                }
                "universal-sdk" => {
                    if let (Some(program_text), Some(sdk_json)) = (usdk_ast_program_text, usdk_json) {
                        let mut sdk_project_json = json_from_str::<ProjectPackageJson>(&sdk_json)?;
                        let (sdk_ast_program_text, sdk_project_json) = add_project_vec_to_universal_sdk(
                            &manifest_data.app_name,
                            &vec![package_name.to_string()],
                            &program_text,
                            &mut sdk_project_json,
                        )?;
                        results.insert("sdk_ast_program_text".to_string(), ArtifactResult::String(sdk_ast_program_text));
                        results.insert("sdk_project_json".to_string(), ArtifactResult::String(json_to_string_pretty(&sdk_project_json)?));
                    } else {
                        return Err(anyhow::anyhow!("Program text and SDK JSON data are required for universal-sdk artifact type."));
                    }
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Library => {
            let mut library_manifest_data = sync_library_setup(
                &package_name,
                manifest_data,
                stdout,
                matches,
                prompts_map)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_library_to_manifest_with_validation(&mut library_manifest_data, stdout)?;
                    results.insert("manifest".to_string(), ArtifactResult::String(forklaunch_manifest_buffer));
                }
                "runtime" => {
                    let runtime = manifest_data.runtime.parse()?;
                    match runtime {
                        Runtime::Bun => {
                            if let Some(package_json) = package_json {
                                add_project_definition_to_package_json_mut(
                                    package_json,
                                    &package_name,)?;
                                let new_package_json_projects: HashSet<String> = package_json.workspaces
                                    .as_ref()
                                    .unwrap_or(&Vec::new())
                                    .iter()
                                    .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                                    .cloned()
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_package_json_projects,
                                    &format!("Successfully added {} to package.json", package_name),
                                    &format!("Library {} was not added to package.json", package_name),
                                    "sync:library:95",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to package.json", package_name));
                                }
                                let application_package_json_buffer = json_to_string_pretty(&package_json)?;
                                results.insert("package_json".to_string(), ArtifactResult::String(application_package_json_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Package.json data is required for Bun runtime."));
                            }
                        }
                        Runtime::Node => {
                            if let Some(pnpm_workspace) = pnpm_workspace {
                                add_project_definition_to_pnpm_workspace_mut(
                                    pnpm_workspace, &package_name)?;
                                let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages
                                    .iter()
                                    .filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str()))
                                    .map(|project| project.to_string().to_owned())
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_pnpm_workspace_projects,
                                    &format!("Successfully added {} to pnpm-workspace.yaml", package_name),
                                    &format!("Library {} was not added to pnpm-workspace.yaml", package_name),
                                    "sync:library:95",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", package_name));
                                }
                                let application_pnpm_workspace_buffer = yaml_to_string(&pnpm_workspace)?;
                                results.insert("pnpm_workspace".to_string(), ArtifactResult::String(application_pnpm_workspace_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Pnpm workspace data is required for Node runtime."));
                            }
                        }
                    }
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Module => {
            let mut module_manifest_data = sync_module_setup(
                &package_name,
                manifest_data,
                stdout,
                matches,
                prompts_map)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_module_to_manifest_with_validation(&mut module_manifest_data, stdout)?;
                    results.insert("manifest".to_string(), ArtifactResult::String(forklaunch_manifest_buffer));
                }
                "docker_compose" => {
                    if let Some(docker_compose) = docker_compose {
                        let docker_compose_buffer = add_module_to_docker_compose_with_validation(&mut module_manifest_data, app_root_path, &yaml_to_string(&docker_compose)?, stdout)?;
                        results.insert("docker_compose".to_string(), ArtifactResult::String(docker_compose_buffer));
                    } else {
                        return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
                    }
                }
                "runtime" => {
                    let runtime = manifest_data.runtime.parse()?;
                    match runtime {
                        Runtime::Bun => {
                            if let Some(package_json) = package_json {
                                add_project_definition_to_package_json_mut(
                                    package_json,
                                    &package_name,)?;
                                let new_package_json_projects: HashSet<String> = package_json.workspaces
                                    .iter()
                                    .flatten()
                                    .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                                    .cloned()
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_package_json_projects,
                                    &format!("Successfully added {} to package.json", package_name),
                                    &format!("Module {} was not added to package.json", package_name),
                                    "sync:module:95",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to package.json", package_name));
                                }
                                let application_package_json_buffer = json_to_string_pretty(&package_json)?;
                                results.insert("package_json".to_string(), ArtifactResult::String(application_package_json_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Package.json data is required for Bun runtime."));
                            }
                        }
                        Runtime::Node => {
                            if let Some(pnpm_workspace) = pnpm_workspace {
                                add_project_definition_to_pnpm_workspace_mut(
                                    pnpm_workspace, &package_name)?;
                                let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages
                                    .iter()
                                    .filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str()))
                                    .map(|project| project.as_str().to_owned())
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_pnpm_workspace_projects,
                                    &format!("Successfully added {} to pnpm-workspace.yaml", package_name),
                                    &format!("Module {} was not added to pnpm-workspace.yaml", package_name),
                                    "sync:module:95",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", package_name));
                                }
                                let application_pnpm_workspace_buffer = yaml_to_string(&pnpm_workspace)?;
                                results.insert("pnpm_workspace".to_string(), ArtifactResult::String(application_pnpm_workspace_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Pnpm workspace data is required for Node runtime."));
                            }
                        }
                    }
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Router => {
            let (mut router_manifest_data, service_name) = sync_router_setup(
                &package_name,
                &app_root_path,
                manifest_data,
                stdout,
                matches,
                prompts_map)?;
            let project_type = router_manifest_data.projects.iter().find(|project| project.name == package_name).unwrap().r#type.clone();
            match artifact_type {
                "manifest" => {
                    let (project_type, forklaunch_manifest_buffer) = add_router_to_manifest_with_validation(&mut router_manifest_data, &service_name, modules_path, app_root_path, stdout)?;
                    results.insert("manifest".to_string(), ArtifactResult::String(forklaunch_manifest_buffer));
                    results.insert("project_type".to_string(), ArtifactResult::ProjectType(project_type));
                }
                "server" => {
                    let server_buffer = add_router_server_with_validation(&mut router_manifest_data, modules_path)?;
                    results.insert("server".to_string(), ArtifactResult::String(server_buffer));
                }
                "sdk" => {
                    let sdk_buffer = add_router_sdk_with_validation(&mut router_manifest_data, modules_path)?;
                    results.insert("sdk".to_string(), ArtifactResult::String(sdk_buffer));
                }
                "registrations" => {
                    let registrations_buffer = add_router_registrations_with_validation(&mut router_manifest_data, project_type, modules_path)?;
                    results.insert("registrations".to_string(), ArtifactResult::String(registrations_buffer));
                }
                "persistence" => {
                    let (entities_index_ts, seeders_index_ts, seed_data_ts) = add_router_persistence_with_validation(&mut router_manifest_data, project_type, modules_path)?;
                    results.insert("entities_index_ts".to_string(), ArtifactResult::String(entities_index_ts));
                    results.insert("seeders_index_ts".to_string(), ArtifactResult::String(seeders_index_ts));
                    results.insert("seed_data_ts".to_string(), ArtifactResult::String(seed_data_ts));
                }
                "controllers" => {
                    let controllers_buffer = add_router_controllers_with_validation(&mut router_manifest_data, modules_path)?;
                    results.insert("controllers".to_string(), ArtifactResult::String(controllers_buffer));
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Worker => {
            let mut worker_manifest_data = sync_worker_setup(
                &package_name,
                manifest_data,
                stdout,
                matches,
                prompts_map)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_worker_to_manifest_with_validation(&mut worker_manifest_data, stdout)?;
                    results.insert("manifest".to_string(), ArtifactResult::String(forklaunch_manifest_buffer));
                }
                "docker_compose" => {
                    if let Some(docker_compose) = docker_compose {
                        let docker_compose_buffer = add_worker_to_docker_compose_with_validation(&mut worker_manifest_data, app_root_path, &yaml_to_string(&docker_compose)?, stdout)?;
                        results.insert("docker_compose".to_string(), ArtifactResult::String(docker_compose_buffer));
                    } else {
                        return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
                    }
                }
                "runtime" => {
                    let runtime = manifest_data.runtime.parse()?;
                    match runtime {
                        Runtime::Bun => {
                            if let Some(package_json) = package_json {
                                add_project_definition_to_package_json_mut(
                                    package_json,
                                    &package_name,)?;
                                let new_package_json_projects: HashSet<String> = package_json.workspaces
                                    .as_ref()
                                    .unwrap_or(&Vec::new())
                                    .iter()
                                    .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                                    .cloned()
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_package_json_projects,
                                    &format!("Successfully added {} to package.json", package_name),
                                    &format!("Worker {} was not added to package.json", package_name),
                                    "sync:worker:95",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to package.json", package_name));
                                }
                                let application_package_json_buffer = json_to_string_pretty(&package_json)?;
                                results.insert("package_json".to_string(), ArtifactResult::String(application_package_json_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Package.json data is required for Bun runtime."));
                            }
                        }
                        Runtime::Node => {
                            if let Some(pnpm_workspace) = pnpm_workspace {
                                add_project_definition_to_pnpm_workspace_mut(
                                    pnpm_workspace, &package_name)?;
                                let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages
                                    .iter()
                                    .filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str()))
                                    .map(|project| project.as_str().to_owned())
                                    .collect();
                                let validation_result = validate_addition_to_artifact(
                                    &package_name,
                                    &new_pnpm_workspace_projects,
                                    &format!("Successfully added {} to pnpm-workspace.yaml", package_name),
                                    &format!("Worker {} was not added to pnpm-workspace.yaml", package_name),
                                    "sync:worker:95",
                                    stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", package_name));
                                }
                                let application_pnpm_workspace_buffer = yaml_to_string(&pnpm_workspace)?;
                                results.insert("pnpm_workspace".to_string(), ArtifactResult::String(application_pnpm_workspace_buffer));
                            } else {
                                return Err(anyhow::anyhow!("Pnpm workspace data is required for Node runtime."));
                            }
                        }
                    }
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
    }
    
    Ok(results)
}

pub(crate) fn remove_package_from_artifact(
    packages_to_remove: &Vec<String>,
    manifest_data: &mut ApplicationManifestData,
    docker_compose: Option<&mut DockerCompose>,
    package_json: Option<&mut ApplicationPackageJson>,
    pnpm_workspace: Option<&mut PnpmWorkspace>,
    _universal_sdk_program_text: Option<&mut String>,
    _universal_sdk_json: Option<&mut String>,
    _app_root_path: &Path,
    modules_path: &Path,
    artifact_type: &str,
    stdout: &mut StandardStream,
) -> Result<HashMap<String, ArtifactResult>> {
    let mut results = HashMap::new();
    match artifact_type {
        "manifest" => {
            for project_name in packages_to_remove {
                remove_project_definition_from_manifest(manifest_data, &project_name)?;
            }
            let new_manifest_projects: HashSet<String> = manifest_data.projects
                .iter()
                .map(|project| project.name.clone())
                .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                .collect();
            let validation_result = validate_removal_from_artifact(
                &new_manifest_projects,
                &packages_to_remove.into_iter().cloned().collect(),
                &format!("Successfully removed {} project(s) from manifest.toml", packages_to_remove.len()),
                &format!("Some projects were not removed from manifest.toml"),
                "sync:utils:404",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to remove {} project(s) from manifest.toml", packages_to_remove.len()));
            }
            results.insert("manifest".to_string(), ArtifactResult::Manifest(manifest_data.clone()));
        }
        "docker_compose" => {
            if let Some(docker_compose) = docker_compose {
                for project_name in packages_to_remove {
                    remove_service_from_docker_compose(docker_compose, &project_name)?;
                    remove_worker_from_docker_compose(docker_compose, &project_name)?;
                }
                let new_docker_services: HashSet<String> = docker_compose.services
                    .keys()
                    .filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str()))
                    .cloned()
                    .collect();
                let validation_result = validate_removal_from_artifact(
                    &new_docker_services,
                    &packages_to_remove.into_iter().cloned().collect(),
                    &format!("Successfully removed {} project(s) from docker-compose.yml", packages_to_remove.len()),
                    &format!("Some projects were not removed from docker-compose.yml"),
                    "sync:utils:421",
                    stdout,
                )?;
                if !validation_result {
                    return Err(anyhow::anyhow!("Failed to remove {} project(s) from docker-compose.yml", packages_to_remove.len()));
                }
                results.insert("docker_compose".to_string(), ArtifactResult::DockerCompose(docker_compose.clone()));
            } else {
                return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
            }
        }
        "runtime" => {
            match manifest_data.runtime.parse()? {
                Runtime::Node => {
                    if let Some(pnpm_workspace) = pnpm_workspace {
                        for project_name in packages_to_remove {
                            remove_project_definition_from_pnpm_workspace(pnpm_workspace, &project_name)?;
                        }
                        let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages
                            .iter()
                            .filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str()))
                            .cloned()
                            .collect();
                        let validation_result = validate_removal_from_artifact(
                            &new_pnpm_workspace_projects,
                            &packages_to_remove.into_iter().cloned().collect(),
                            &format!("Successfully removed {} project(s) from pnpm-workspace.yaml", packages_to_remove.len()),
                            &format!("Some projects were not removed from pnpm-workspace.yaml"),
                            "sync:utils:440",
                            stdout,
                        )?;
                        if !validation_result {
                            return Err(anyhow::anyhow!("Failed to remove {} project(s) from pnpm-workspace.yaml", packages_to_remove.len()));
                        }
                        results.insert("pnpm_workspace".to_string(), ArtifactResult::PnpmWorkspace(pnpm_workspace.clone()));
                    }
                }
                Runtime::Bun => {
                    if let Some(package_json) = package_json {
                        for project_name in packages_to_remove {
                            remove_project_definition_from_package_json(package_json, &project_name)?;
                        }
                        let new_package_json_projects: HashSet<String> = package_json.workspaces
                            .as_ref()
                            .unwrap_or(&Vec::new())
                            .iter()
                            .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                            .cloned()
                            .collect();
                        let validation_result = validate_removal_from_artifact(
                            &new_package_json_projects,
                            &packages_to_remove.into_iter().cloned().collect(),
                            &format!("Successfully removed {} project(s) from package.json", packages_to_remove.len()),
                            &format!("Some projects were not removed from package.json"),
                            "sync:utils:445",
                            stdout,
                        )?;
                        if !validation_result {
                            return Err(anyhow::anyhow!("Failed to remove {} project(s) from package.json", packages_to_remove.len()));
                        }
                        results.insert("package_json".to_string(), ArtifactResult::PackageJson(package_json.clone()));
                    }
                }
            }
        }
        "universal-sdk" => {
            let (mut universal_sdk_program_text, mut universal_sdk_json) = read_universal_sdk_content(&modules_path)?;
            (universal_sdk_program_text, universal_sdk_json) = remove_project_vec_from_universal_sdk(
                &manifest_data.app_name,
                &packages_to_remove,
                &universal_sdk_program_text,
                &mut universal_sdk_json,
                stdout,
            )?;
            results.insert("sdk_ast_program_text".to_string(), ArtifactResult::String(universal_sdk_program_text));
            results.insert("sdk_project_json".to_string(), ArtifactResult::String(json_to_string_pretty(&universal_sdk_json)?));
        }
        _ => {
            return Err(anyhow::anyhow!("Invalid artifact type"));
        }
    }
    Ok(results)
}


/// Validates that a service name is present in a collection of project names and provides appropriate feedback
pub(crate) fn validate_addition_to_artifact(
    package_name: &str,
    new_projects: &HashSet<String>,
    success_message: &str,
    error_message: &str,
    debug_context: &str,
    stdout: &mut StandardStream,
) -> Result<bool> {
    println!("{debug_context} new_projects: {:?}", new_projects);
    
    if new_projects.iter().any(|project| project.contains(package_name)) {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{}", success_message)?;
        stdout.reset()?;
        Ok(true)
    } else {
        println!("{debug_context} difference: {:?}", new_projects);
        return Err(anyhow::anyhow!("{}", error_message))
    }
}

pub(crate) fn validate_removal_from_artifact(
    new_projects: &HashSet<String>,
    dir_project_names_set: &HashSet<String>,
    success_message: &str,
    error_message: &str,
    debug_context: &str,
    stdout: &mut StandardStream,
) -> Result<bool>
{
    if new_projects.difference(dir_project_names_set).count() != 0 {
        println!("{debug_context} difference: {:?}", new_projects.difference(dir_project_names_set));
        return Err(anyhow::anyhow!("{}", error_message))
    } else {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{}", success_message)?;
        stdout.reset()?;
        Ok(true)
    }
}

/// Analyzes project references in a TypeScript file and compares against a target list
/// 
/// # Arguments
/// * `file_path` - Path to the TypeScript file to analyze
/// * `target_projects` - List of project names to compare against
/// 
/// # Returns
/// * `Result<(Vec<String>, Vec<String>)>` - Tuple of (projects_to_add, projects_to_remove)
///   - projects_to_add: projects in target_projects but not found in AST
///   - projects_to_remove: projects found in AST but not in target_projects
pub(crate) fn find_project_references_in_ts_file(
    file_path: &Path,
    target_projects: &Vec<String>,
) -> Result<(Vec<String>, Vec<String>)> {
    let source_text = read_to_string(file_path)?;
    let source_type = SourceType::from_path(file_path)?;
    
    let allocator = Allocator::default();
    let program = parse_ast_program(&allocator, &source_text, source_type);
    
    analyze_project_references_against_target(&program, target_projects)
}