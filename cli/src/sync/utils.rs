use std::{path::Path, collections::HashSet, io::Write};

use anyhow::Result;
use clap::ArgMatches;
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};
use crate::{
    constants::InitializeType,
    core::{
        manifest::{application::ApplicationManifestData}, 
        docker::DockerCompose,
    },
    sync::{
        service::{sync_service_setup, add_service_to_manifest_with_validation, add_service_to_docker_compose_with_validation, add_service_to_runtime_files_with_validation}, 
        library::{sync_library_setup, add_library_to_manifest_with_validation, add_library_to_runtime_files_with_validation}, 
        module::{sync_module_setup, add_module_to_manifest_with_validation, add_module_to_docker_compose_with_validation, add_module_to_runtime_files_with_validation}, 
        router::{sync_router_setup, add_router_to_manifest_with_validation, add_router_server_with_validation, add_router_sdk_with_validation, add_router_registrations_with_validation, add_router_persistence_with_validation, add_router_controllers_with_validation}, 
        worker::{sync_worker_setup, add_worker_to_manifest_with_validation, add_worker_to_docker_compose_with_validation, add_worker_to_runtime_files_with_validation},
    },
};

pub(crate) fn add_package_to_artifact<T>(
    package_name: &str,
    manifest_data: &mut ApplicationManifestData,
    app_root_path: &Path,
    modules_path: &Path,
    artifact_type: &str,
    package_type: &InitializeType,
    dir_project_names_set: &HashSet<String>,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
    docker_compose: Option<&mut DockerCompose>, //optional
) -> Result<Vec<T>> {
    let mut results = Vec::new();
    match package_type {
        InitializeType::Service => {
            let mut service_manifest_data = sync_service_setup(
                &package_name, 
                &app_root_path, 
                &modules_path, 
                &mut manifest_data, 
                &mut stdout, 
                matches)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_service_to_manifest_with_validation(&mut service_manifest_data, modules_path, app_root_path, stdout)?;
                    results.push(forklaunch_manifest_buffer);
                }
                "docker_compose" => {
                    if let Some(docker_compose) = docker_compose {
                        let docker_compose_buffer = add_service_to_docker_compose_with_validation(&mut service_manifest_data, modules_path, app_root_path, stdout)?;
                        results.push(docker_compose_buffer);
                    } else {
                        return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
                    }
                }
                "runtime" => {
                    let (package_json_buffer, pnpm_workspace_buffer) = add_service_to_runtime_files_with_validation(
                        &mut service_manifest_data, 
                        modules_path, 
                        app_root_path, 
                        dir_project_names_set, 
                        stdout)?;
                    let items = [package_json_buffer, pnpm_workspace_buffer].into_iter().flatten();
                    results.extend(items);
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Library => {
            let mut library_manifest_data = sync_library_setup(
                &package_name,
                &app_root_path,
                &modules_path,
                &mut manifest_data,
                &mut stdout,
                matches)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_library_to_manifest_with_validation(&mut library_manifest_data, stdout)?;
                    results.push(forklaunch_manifest_buffer);
                }
                "runtime" => {
                    let (package_json_buffer, pnpm_workspace_buffer) = add_library_to_runtime_files_with_validation(
                        &mut library_manifest_data, 
                        modules_path, 
                        app_root_path, 
                        dir_project_names_set, 
                        stdout)?;
                    let items = [package_json_buffer, pnpm_workspace_buffer].into_iter().flatten();
                    results.extend(items);
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Module => {
            let mut module_manifest_data = sync_module_setup(
                &package_name,
                &app_root_path,
                &modules_path,
                &mut manifest_data,
                &mut stdout,
                matches)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_module_to_manifest_with_validation(&mut module_manifest_data, modules_path, app_root_path, stdout)?;
                    results.push(forklaunch_manifest_buffer);
                }
                "docker_compose" => {
                    if let Some(docker_compose) = docker_compose {
                        let docker_compose_buffer = add_module_to_docker_compose_with_validation(&mut module_manifest_data, modules_path, app_root_path, stdout)?;
                        results.push(docker_compose_buffer);
                    } else {
                        return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
                    }
                }
                "runtime" => {
                    let (package_json_buffer, pnpm_workspace_buffer) = add_module_to_runtime_files_with_validation(
                        &mut module_manifest_data, 
                        modules_path, 
                        app_root_path, 
                        dir_project_names_set, 
                        stdout)?;
                    let items = [package_json_buffer, pnpm_workspace_buffer].into_iter().flatten();
                    results.extend(items);
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Router => {
            let mut router_manifest_data = sync_router_setup(
                &package_name,
                &app_root_path,
                &modules_path,
                &mut manifest_data,
                &mut stdout,
                matches)?;
            let project_type = router_manifest_data.projects_mut().iter().find(|project| project.name == package_name).unwrap().r#type.clone();
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_router_to_manifest_with_validation(&mut router_manifest_data, modules_path, app_root_path, stdout)?;
                    results.push(forklaunch_manifest_buffer);
                }
                "server" => {
                    let server_buffer = add_router_server_with_validation(&mut router_manifest_data, modules_path)?;
                    results.push(server_buffer);
                }
                "sdk" => {
                    let sdk_buffer = add_router_sdk_with_validation(&mut router_manifest_data, modules_path)?;
                    results.push(sdk_buffer);
                }
                "registrations" => {
                    let registrations_buffer = add_router_registrations_with_validation(&mut router_manifest_data, project_type, modules_path)?;
                    results.push(registrations_buffer);
                }
                "persistence" => {
                    let (entities_index_ts, seeders_index_ts, seed_data_ts) = add_router_persistence_with_validation(&mut router_manifest_data, project_type, modules_path)?;
                    results.push(entities_index_ts);
                    results.push(seeders_index_ts);
                    results.push(seed_data_ts);
                }
                "controllers" => {
                    let controllers_buffer = add_router_controllers_with_validation(&mut router_manifest_data, modules_path)?;
                    results.push(controllers_buffer);
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        InitializeType::Worker => {
            let worker_manifest_data = sync_worker_setup(
                &package_name,
                &app_root_path,
                &modules_path,
                &mut manifest_data,
                &mut stdout,
                matches)?;
            match artifact_type {
                "manifest" => {
                    let forklaunch_manifest_buffer = add_worker_to_manifest_with_validation(&mut worker_manifest_data, modules_path, app_root_path, stdout)?;
                    results.push(forklaunch_manifest_buffer);
                }
                "docker_compose" => {
                    if let Some(docker_compose) = docker_compose {
                        let docker_compose_buffer = add_worker_to_docker_compose_with_validation(&mut worker_manifest_data, modules_path, app_root_path, stdout)?;
                        results.push(docker_compose_buffer);
                    } else {
                        return Err(anyhow::anyhow!("Docker compose data is required to proceed."));
                    }
                }
                "runtime" => {
                    let (package_json_buffer, pnpm_workspace_buffer) = add_worker_to_runtime_files_with_validation(
                        &mut worker_manifest_data, 
                        modules_path, 
                        app_root_path, 
                        dir_project_names_set, 
                        stdout)?;
                    let items = [package_json_buffer, pnpm_workspace_buffer].into_iter().flatten();
                    results.extend(items);
                }
                _ => {
                    return Err(anyhow::anyhow!("Invalid artifact type"));
                }
            }
        }
        _ => {
            return Err(anyhow::anyhow!("Invalid package type"));
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
    
    if new_projects.contains(package_name) {
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