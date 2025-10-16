use std::{fs::{self, read_to_string}, path::{Path}, io::{Write}, collections::HashSet};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use serde_yml::{from_str as yaml_from_str, to_string as yaml_to_string};
use serde_json::{to_string_pretty as json_to_string_pretty, from_str as json_from_str};
use toml::{from_str as toml_from_str, to_string_pretty as toml_to_string_pretty};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_WRITE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE,
        ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
        ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
        ERROR_FAILED_TO_CREATE_PACKAGE_JSON,
        ERROR_FAILED_TO_READ_PNPM_WORKSPACE,
        ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE,
        Runtime, InitializeType,
    },
    core::{
        command::command,
        manifest::{
            ApplicationInitializationMetadata, InitializableManifestConfig,
            InitializableManifestConfigMetadata,
            application::ApplicationManifestData,
            remove_project_definition_from_manifest,
        },
        docker::{
            remove_service_from_docker_compose, remove_worker_from_docker_compose, DockerCompose,
        },
        base_path::{RequiredLocation, find_app_root_path},
        package_json::{
            application_package_json::ApplicationPackageJson, 
            remove_project_definition_from_package_json,
            add_project_definition_to_package_json_mut,
        },
        pnpm_workspace::{
            PnpmWorkspace, 
            remove_project_definition_from_pnpm_workspace,
            add_project_definition_to_pnpm_workspace_mut,
        },
        rendered_template::{RenderedTemplate, write_rendered_templates},
        universal_sdk::{remove_project_vec_from_universal_sdk, add_project_vec_to_universal_sdk, read_universal_sdk_content},
    },
    prompt::{prompt_for_confirmation, prompt_with_validation, ArrayCompleter},
    sync::{
        constants::{RUNTIME_PROJECTS_TO_IGNORE, DIRS_TO_IGNORE, DOCKER_SERVICES_TO_IGNORE}, 
        utils::{validate_removal_from_artifact, validate_addition_to_artifact, add_package_to_artifact, ArtifactResult}},
};

#[derive(Debug)]
pub(crate) struct SyncAllCommand;

impl SyncAllCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}


fn prompt_initialize_category(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
    dir_name: &str,
) -> Result<String> {
    let initialize_category = prompt_with_validation(
        line_editor, 
        stdout, 
        "category", 
        matches, 
        &format!("initialize category for {}", dir_name), 
        Some(&InitializeType::VARIANTS), 
        |input| InitializeType::VARIANTS.contains(&input), 
        |_| "Invalid initialize category. Please try again.".to_string()
    )?;
    Ok(initialize_category)
}
/// Generic function to find directory names in any given path
/// 
/// # Arguments
/// * `path` - The path to search for directories
/// * `ignore_patterns` - Optional slice of directory names to ignore (if None, no directories are ignored)
/// 
/// # Returns
/// * `Result<Vec<String>>` - Vector of directory names found in the path
fn find_directory_names<P: AsRef<Path>>(
    path: P, 
    ignore_patterns: Option<&[&str]>
) -> Result<Vec<String>> {
    let path = path.as_ref();
    let mut directories = vec![];
    
    if !path.exists() {
        return Ok(directories);
    }
    
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            if let Some(dir_name) = entry.path().file_name() {
                let dir_name_str = dir_name.to_string_lossy().to_string();
                
                // Only ignore if ignore_patterns is Some and contains the directory name
                let should_ignore = ignore_patterns
                    .map(|patterns| patterns.contains(&dir_name_str.as_str()))
                    .unwrap_or(false);
                
                if !should_ignore {
                    directories.push(dir_name_str);
                }
            }
        }
    }
    
    Ok(directories)
}

/// Legacy function that maintains the original behavior for backward compatibility
fn find_project_dir_names(modules_path: &Path) -> Result<Vec<String>> {
    let directories = find_directory_names(modules_path, Some(DIRS_TO_IGNORE))?;
    println!("sync:121 project_dirs: {:?}", directories);
    Ok(directories)
}

fn find_file_names(path: &Path) -> Result<Vec<String>> {
    let files = fs::read_dir(path)?;
    let files = files.map(|file| file.unwrap().path().file_name().unwrap().to_string_lossy().to_string()).collect();
    Ok(files)
}

fn check_manifest(manifest_data: &ApplicationManifestData, dir_project_names: &Vec<String>) -> Result<(Vec<String>, Vec<String>)> {
    let manifest_project_names: HashSet<String> = manifest_data.projects
        .iter()
        .map(|project| project.name.clone())
        .collect();
    println!("sync:130 manifest_project_names: {:?}", manifest_project_names);
    let dir_project_names_set: HashSet<String> = dir_project_names
        .iter()
        .cloned()
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    let projects_to_remove: Vec<String> = manifest_project_names
        .difference(&dir_project_names_set)
        .cloned()
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    println!("sync:141 projects_to_remove: {:?}", projects_to_remove);
    let projects_to_add: Vec<String> = dir_project_names_set
        .difference(&manifest_project_names)
        .cloned()
        .collect();
    println!("sync:146 projects_to_add: {:?}", projects_to_add);
    Ok((projects_to_remove, projects_to_add))
}

fn check_docker_compose(docker_compose: &DockerCompose, dir_project_names: &Vec<String>) -> Result<(Vec<String>, Vec<String>)> {
    let docker_services: Vec<String> = docker_compose.services
        .keys()
        .cloned()
        .filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str()))
        .collect();
    println!("sync:156 docker_services: {:?}", docker_services);
    let services_to_remove_docker: Vec<String> = docker_services
        .iter()
        .filter(|service| !dir_project_names.iter().any(|m| service.contains(m)))
        .cloned()
        .collect();
    println!("sync:162 services_to_remove_docker: {:?}", services_to_remove_docker);
    let services_to_add_docker: Vec<String> = dir_project_names
        .iter()
        .filter(|project| !docker_services.iter().any(|m| m.contains(project.as_str())))
        .cloned()
        .collect();
    println!("sync:168 services_to_add_docker: {:?}", services_to_add_docker);
    Ok((services_to_remove_docker, services_to_add_docker))
}

fn check_runtime_files(
    runtime: &Runtime, 
    pnpm_workspace: Option<&PnpmWorkspace>,
    package_json: &ApplicationPackageJson,
    dir_project_names: &Vec<String>
) -> Result<(Vec<String>, Vec<String>)> {
    if *runtime == Runtime::Node {
        if let Some(pnpm_workspace) = pnpm_workspace {
            let pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            let dir_project_names_set: HashSet<String> = dir_project_names.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            let pnpm_workspace_projects_to_remove: Vec<String> = pnpm_workspace_projects
                .difference(&dir_project_names_set)
                .cloned()
                .collect();
            let pnpm_workspace_projects_to_add: Vec<String> = dir_project_names_set
                .difference(&pnpm_workspace_projects)
                .cloned()
                .collect();
            println!("sync:190 pnpm_workspace_projects: {:?}", pnpm_workspace_projects);
            println!("sync:191 pnpm_workspace_projects_to_remove: {:?}", pnpm_workspace_projects_to_remove);
            println!("sync:192 pnpm_workspace_projects_to_add: {:?}", pnpm_workspace_projects_to_add);
            Ok((pnpm_workspace_projects_to_remove, pnpm_workspace_projects_to_add))
        } else {
            return Ok((Vec::new(), Vec::new()));
        }
        
    } else if *runtime == Runtime::Bun {
        let full_package_json = package_json.clone();
        let package_json_projects: HashSet<String> = full_package_json.workspaces.unwrap_or_default().iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
        let dir_project_names_set: HashSet<String> = dir_project_names.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
        println!("sync:210 package_json_projects: {:?}", package_json_projects);
        let package_json_projects_to_remove: Vec<String> = package_json_projects
            .difference(&dir_project_names_set)
            .cloned()
            .collect();
        let package_json_projects_to_add: Vec<String> = dir_project_names_set
            .difference(&package_json_projects)
            .cloned()
            .collect();
        println!("sync:219 package_json_projects_to_remove: {:?}", package_json_projects_to_remove);
        println!("sync:220 package_json_projects_to_add: {:?}", package_json_projects_to_add);
        Ok((package_json_projects_to_remove, package_json_projects_to_add))
    } else {
        Ok((Vec::new(), Vec::new()))
    }
}

fn prompt_sync_confirmation(
    matches: &ArgMatches,
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    message: &str,
) -> Result<bool> {
    let confirm_override = matches.get_flag("confirm");
    if !confirm_override {
        let continue_sync = prompt_for_confirmation(line_editor, message)?;
        if !continue_sync {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(stdout, "Sync cancelled")?;
            stdout.reset()?;
            return Ok(false);
        }
    }
    Ok(true)
}

impl CliCommand for SyncAllCommand {
    fn command(&self) -> Command {
        command(
            "all",
            "Sync all aplication artifacts with application directories",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path"),
        )
        .arg(
            Arg::new("confirm")
                .short('c')
                .long("confirm")
                .help("Flag to confirm any prompts")
                .action(ArgAction::SetTrue),
        )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        // check modules directories against manifest.toml, docker-compose.yml, pnpm-workspace.yaml, and application package.json
        // remove necessary projects from manifest.toml, update docker-compose.yml, pnpm-workspace.yaml, and package.json accordingly
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let is_ci = std::env::var("CI").is_ok();
        if is_ci {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "Running in CI mode - All additions to artifact prompts and actions will be skipped")?;
            stdout.reset()?;
        }
        let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");
        
        // Read in manifest.toml
        let existing_manifest_data = toml_from_str::<ApplicationManifestData>(
            &fs::read_to_string(&manifest_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        
        let mut manifest_data = existing_manifest_data.initialize(
            InitializableManifestConfigMetadata::Application(ApplicationInitializationMetadata {
                app_name: existing_manifest_data.app_name.clone(),
                database: None,
            }),
        );

        let modules_path = app_root_path.join(Path::new(&existing_manifest_data
            .modules_path));
        println!("sync:291 modules_path: {:?}", modules_path);
        
        // Read in docker-compose.yaml
        let docker_compose_path = if app_root_path.join("docker-compose.yaml").exists() {
            app_root_path.join("docker-compose.yaml")
        } else {
            return Err(anyhow::anyhow!(
                "docker-compose.yaml not found in {}",
                app_root_path.display()
            ));
        };

        let mut docker_compose = yaml_from_str(
            &read_to_string(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;

        println!("sync:309 Here we begin the sync operations. Starting with manifest.toml");
        if modules_path.exists() {
            let mut rendered_templates = vec![];
            // project names in directories
            let dir_project_names = find_project_dir_names(&modules_path)?;
            let dir_project_names_set: HashSet<String> = dir_project_names.iter().cloned().collect();
            println!("sync:315 dir_project_names: {:?}", dir_project_names);
            println!("sync:316 dir_project_names_set: {:?}", dir_project_names_set);

            // projects to remove and add from manifest.toml
            let (manifest_projects_to_remove, manifest_projects_to_add) = check_manifest(&manifest_data, &dir_project_names)?;
            
            // projects to remove from docker-compose.yml
            let (services_to_remove_docker, services_to_add_docker) = check_docker_compose(&docker_compose, &dir_project_names)?;
            
            // RODO: check routers for services in directory {service_name}/services against manifest.toml
            
            // remove projects from manifest.toml
            if !manifest_projects_to_remove.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in manifest that no longer exist in directories:", manifest_projects_to_remove.len())?;
                for project_name in &manifest_projects_to_remove {
                    writeln!(stdout, "  - {}", project_name)?;
                }
                stdout.reset()?;
                
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to remove these projects from manifest.toml? (y/N) ")?;
                
                // remove projects from manifest.toml
                if continue_sync {
                    for project_name in &manifest_projects_to_remove {
                        remove_project_definition_from_manifest(&mut manifest_data, &project_name)?;
                    }
                }
                let new_manifest_projects: HashSet<String> = manifest_data.projects.iter().map(|project| project.name.clone()).filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
                println!("sync:347 new_manifest_projects: {:?}", new_manifest_projects);
                let validation_result = validate_removal_from_artifact(
                    &new_manifest_projects,
                    &dir_project_names_set,
                    &format!("Successfully removed {} project(s) from manifest.toml", manifest_projects_to_remove.len()),
                    &format!("Some projects were not removed from manifest.toml"),
                    "sync:345",
                    &mut stdout)?;
                if validation_result {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "Successfully removed {} project(s) from manifest.toml", manifest_projects_to_remove.len())?;
                    stdout.reset()?;
                } else {
                    return Err(anyhow::anyhow!("Failed to remove {} project(s) from manifest.toml", manifest_projects_to_remove.len()));
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No projects to remove from manifest.toml")?;
                stdout.reset()?;
            }
            if !manifest_projects_to_add.is_empty() && !is_ci {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in directories that are not in manifest:", manifest_projects_to_add.len())?;
                for project_name in &manifest_projects_to_add {
                    writeln!(stdout, "  - {}", project_name)?;
                }
                stdout.reset()?;
                // writeln!(stdout, "Please add these projects to the manifest.")?;
                // TODO: add projects to manifest.toml
                // read directory, create manifest data, add project to manifest.toml
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to add these projects to manifest.toml? (y/N) ")?;
                if continue_sync {
                    let mut new_manifest_data = manifest_data.clone();
                    for dir_name in &manifest_projects_to_add {
                        let package_type: InitializeType = prompt_initialize_category(
                            &mut line_editor, 
                            &mut stdout, 
                            matches,
                            &dir_name,
                        )?.parse()?;
                        let artifacts = add_package_to_artifact(
                            &dir_name,
                            &mut new_manifest_data,
                            &app_root_path,
                            &modules_path,
                            "manifest",
                            &package_type,
                            &mut stdout,
                            matches,
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                        )?;
                        if let Some(ArtifactResult::String(manifest_str)) = artifacts.get("manifest") {
                            new_manifest_data = toml_from_str::<ApplicationManifestData>(manifest_str)?;
                        }
                        // project_type = artifacts[1].clone();
                        
                    }
                    manifest_data = new_manifest_data;
                    // project_type = artifacts[1].clone();
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No projects to add to manifest.toml")?;
                stdout.reset()?;
            }
            
            let (new_manifest_projects_to_remove, new_manifest_projects_to_add) = check_manifest(&manifest_data, &dir_project_names)?;
            if new_manifest_projects_to_remove.is_empty() && new_manifest_projects_to_add.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Successfully synced manifest.toml")?;
                stdout.reset()?;
                // write manifest.toml
                let manifest_content = toml_to_string_pretty(&manifest_data)
                    .with_context(|| ERROR_FAILED_TO_WRITE_MANIFEST)?;
                rendered_templates.push(
                    RenderedTemplate {
                        path: manifest_path,
                        content: manifest_content,
                        context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
                    },
                );
            } else {
                if !is_ci {
                    return Err(anyhow::anyhow!("Failed to sync manifest.toml"));
                }
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Skipping validation for manifest.toml due to CI mode")?;
                stdout.reset()?;
            }
            
            // remove projects from docker-compose.yaml
            if !services_to_remove_docker.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} service(s) in docker-compose.yaml that no longer exist in directories:", services_to_remove_docker.len())?;
                for service in &services_to_remove_docker {
                    writeln!(stdout, "  - {}", service)?;
                }
                stdout.reset()?;
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to remove these services from docker-compose.yaml? (y/N) ")?;
                if continue_sync {
                    for service in &services_to_remove_docker {
                        remove_service_from_docker_compose(&mut docker_compose, &service)?;
                        remove_worker_from_docker_compose(&mut docker_compose, &service)?;
                    }
                }
                let new_docker_services: HashSet<String> = docker_compose.services.keys().cloned().filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str())).collect();
                println!("sync:409 new_docker_services: {:?}", new_docker_services);
                let validation_result = validate_removal_from_artifact(
                    &new_docker_services,
                    &dir_project_names_set,
                    &format!("Successfully removed {} service(s) from docker-compose.yaml", services_to_remove_docker.len()),
                    &format!("Some services were not removed from docker-compose.yaml"),
                    "sync:467",
                    &mut stdout)?;
                if validation_result {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "Successfully removed {} service(s) from docker-compose.yaml", services_to_remove_docker.len())?;
                    stdout.reset()?;
                } else {
                    if !is_ci {
                        return Err(anyhow::anyhow!("Failed to remove {} service(s) from docker-compose.yaml", services_to_remove_docker.len()));
                    }
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                    writeln!(stdout, "Skipping validation for docker-compose.yaml due to CI mode")?;
                    stdout.reset()?;
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No services to remove from docker-compose.yaml")?;
                stdout.reset()?;
            }
            // let mut docker_compose_string = String::new();
            if !services_to_add_docker.is_empty() && !is_ci {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} service(s) in directories that are not in docker-compose.yaml:", services_to_add_docker.len())?;
                for service in &services_to_add_docker {
                    writeln!(stdout, "  - {}", service)?;
                }
                stdout.reset()?;
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to add these services to docker-compose.yaml? (y/N) ")?;
                if continue_sync {
                    // docker_compose_string = yaml_to_string(&docker_compose)?;
                    for dir_name in &services_to_add_docker {
                        let package_type: InitializeType = prompt_initialize_category(
                            &mut line_editor, 
                            &mut stdout, 
                            matches,
                            &dir_name,
                        )?.parse()?;
                        if !matches!(package_type, InitializeType::Router | InitializeType::Library) {
                            //TODO: make it so less times convert to string and back to DockerCompose
                            let artifacts = add_package_to_artifact(
                                &dir_name,
                                &mut manifest_data,
                                &app_root_path,
                                &modules_path,
                                "docker_compose",
                                &package_type,
                                &mut stdout,
                                matches,
                                Some(&mut docker_compose),
                                None,
                                None,
                                None,
                                None,
                                None,
                                None,
                            )?;
                            if let Some(ArtifactResult::String(s)) = artifacts.get("docker_compose") {
                                docker_compose = yaml_from_str(&s)?;
                            }
                        }
                    }
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No services to add to docker-compose.yaml")?;
                stdout.reset()?;
            }
            // if docker_compose_string.is_empty() {
            //     println!("sync:535 docker_compose_string is empty");
            //     docker_compose_string = yaml_to_string(&docker_compose)?;
            // }
            // let docker_compose_data: DockerCompose = yaml_from_str(&docker_compose_string)?;
            let (new_docker_services_to_remove, new_docker_services_to_add) = check_docker_compose(&docker_compose, &dir_project_names)?;
            if new_docker_services_to_remove.is_empty() && new_docker_services_to_add.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Successfully synced docker-compose.yaml")?;
                stdout.reset()?;    
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Something went wrong syncing docker-compose.yaml, this maybe due to the package being a library or router and was not added to the docker-compose.yaml file.")?;
                stdout.reset()?;
            }
            // write docker-compose.yaml
            rendered_templates.push(
                RenderedTemplate {
                    path: docker_compose_path,
                    content: yaml_to_string(&docker_compose)?,
                    context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
                },
            );
            
            // projects to remove from pnpm-workspace.yaml and package.json
            let application_package_json_path = if modules_path.join("package.json").exists() {
                    modules_path.join("package.json")
                } else {
                    return Err(anyhow::anyhow!(
                        "package.json not found in {}",
                        modules_path.display()
                    ));
                };
            let mut package_json: ApplicationPackageJson = json_from_str(
                &read_to_string(application_package_json_path)
                    .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;
            let pnpm_workspace_path = modules_path.join("pnpm-workspace.yaml");
            let mut pnpm_workspace: Option<PnpmWorkspace> = if pnpm_workspace_path.exists() {
                Some(yaml_from_str(
                    &read_to_string(pnpm_workspace_path)
                        .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
                )
                .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?)
            } else {
                None
            };
            let (runtime_projects_to_remove, runtime_projects_to_add) = check_runtime_files(
                &manifest_data.runtime.parse::<Runtime>()?, 
                pnpm_workspace.as_ref(), 
                &package_json, 
                &dir_project_names)?;
            println!("sync:448 runtime_projects_to_remove: {:?}", runtime_projects_to_remove);
            println!("sync:449 runtime_projects_to_add: {:?}", runtime_projects_to_add);
            // remove projects from pnpm-workspace.yaml and package.json
            let mut pnpm_workspace_buffer: Option<String> = None;
            let mut application_package_json_buffer: Option<String> = Some(yaml_to_string(&package_json)?);
            match manifest_data.runtime.parse::<Runtime>()? {
                Runtime::Node => {
                    if !runtime_projects_to_remove.is_empty() {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in pnpm-workspace.yaml that no longer exist in directories:", runtime_projects_to_remove.len())?;
                        for package in &runtime_projects_to_remove {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        stdout.reset()?;
                        let continue_sync = prompt_sync_confirmation(
                            matches, 
                            &mut line_editor, 
                            &mut stdout, 
                            "Do you want to remove these packages from pnpm-workspace.yaml? (y/N) ")?;
                        if continue_sync {
                            
                            println!("sync:468 pnpm_workspace: {:?}", pnpm_workspace);
                            if let Some(ref mut pnpm_workspace) = pnpm_workspace {
                                for package in &runtime_projects_to_remove {
                                    println!("sync:470 package: {:?}", package);
                                    remove_project_definition_from_pnpm_workspace(
                                        pnpm_workspace,
                                        &package,
                                    )?;
                                    println!("sync:475 content: {:?}", pnpm_workspace);
                                }
                                println!("sync:477 content: {:?}", pnpm_workspace);
                                let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
                                println!("sync:484 new_pnpm_workspace_projects: {:?}", new_pnpm_workspace_projects);
                                let validation_result = validate_removal_from_artifact(
                                    &new_pnpm_workspace_projects,
                                    &dir_project_names_set,
                                    &format!("Successfully removed {} package(s) from pnpm-workspace.yaml", runtime_projects_to_remove.len()),
                                    &format!("Some packages were not removed from pnpm-workspace.yaml"),
                                    "sync:484",
                                    &mut stdout)?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to remove {} package(s) from pnpm-workspace.yaml", runtime_projects_to_remove.len()));
                                }
                            }
                        }  
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to remove from pnpm-workspace.yaml")?;
                        stdout.reset()?;
                    }
                    if !runtime_projects_to_add.is_empty() && !is_ci {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in directories that are not in pnpm-workspace.yaml:", runtime_projects_to_add.len())?;
                        for package in &runtime_projects_to_add {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        writeln!(stdout, "Please add these packages to pnpm-workspace.yaml")?;
                        stdout.reset()?;
                        let continue_sync = prompt_sync_confirmation(
                            matches, 
                            &mut line_editor, 
                            &mut stdout, 
                            "Do you want to add these packages to pnpm-workspace.yaml? (y/N) ")?;
                        if continue_sync {
                            for dir_name in &runtime_projects_to_add {
                                let package_type: InitializeType = prompt_initialize_category(
                                    &mut line_editor, 
                                    &mut stdout, 
                                    matches,
                                    &dir_name,
                                )?.parse()?;
                                // check if package type is router, if not router use add_project_definition_to_pnpm_workspace
                                if package_type != InitializeType::Router {
                                    if let Some(ref mut pnpm_workspace) = pnpm_workspace {
                                        add_project_definition_to_pnpm_workspace_mut(
                                                pnpm_workspace,
                                                &dir_name,
                                            )?;
                                    }
                                }
                                if let Some(ref pnpm_workspace) = pnpm_workspace {
                                    let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
                                    let validation_result = validate_addition_to_artifact(
                                        &dir_name,
                                        &new_pnpm_workspace_projects,
                                        &format!("Successfully added {} to pnpm-workspace.yaml", dir_name),
                                        &format!("Package {} was not added to pnpm-workspace.yaml", dir_name),
                                        "sync:679",
                                        &mut stdout,
                                    )?;
                                    if !validation_result {
                                        return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", dir_name));
                                    }
                                }
                            }
                        }
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to add to pnpm-workspace.yaml")?;
                        stdout.reset()?;
                    }
                    pnpm_workspace_buffer = Some(yaml_to_string(&pnpm_workspace)?);
                }
                Runtime::Bun => {
                    println!("sync:533 package_json: {:?}", package_json);
                    if !runtime_projects_to_remove.is_empty() {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in package.json that no longer exist in directories:", runtime_projects_to_remove.len())?;
                        for package in &runtime_projects_to_remove {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        stdout.reset()?;
                        let continue_sync = prompt_sync_confirmation(
                            matches, 
                            &mut line_editor, 
                            &mut stdout, 
                            "Do you want to remove these packages from package.json? (y/N) ")?;
                        if continue_sync {
                            for package in &runtime_projects_to_remove {
                                println!("sync:536 package: {:?}", package);
                                remove_project_definition_from_package_json(
                                    &mut package_json,
                                    &package,
                                )?;
                                println!("sync:539 package_json: {:?}", package_json);
                            }
                            let new_package_json_projects: HashSet<String> = package_json.workspaces.as_ref().unwrap_or(&vec![]).iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
                            println!("sync:547 new_package_json_projects: {:?}", new_package_json_projects);
                            let validation_result = validate_removal_from_artifact(
                                &new_package_json_projects,
                                &dir_project_names_set,
                                &format!("Successfully removed {} package(s) from package.json", runtime_projects_to_remove.len()),
                                &format!("Some packages were not removed from package.json"),
                                "sync:547",
                                &mut stdout,
                            )?;
                            if !validation_result {
                                return Err(anyhow::anyhow!("Failed to remove {} package(s) from package.json", runtime_projects_to_remove.len()));
                            }
                        }
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to remove from package.json")?;
                        stdout.reset()?;
                    }
                    if !runtime_projects_to_add.is_empty() && !is_ci {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in directories that are not in package.json:", runtime_projects_to_add.len())?;
                        for package in &runtime_projects_to_add {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        writeln!(stdout, "Please add these packages to package.json")?;
                        stdout.reset()?;
                        let continue_sync = prompt_sync_confirmation(
                            matches, 
                            &mut line_editor, 
                            &mut stdout, 
                            "Do you want to add these packages to package.json? (y/N) ")?;
                        if continue_sync {
                            for dir_name in &runtime_projects_to_add {
                                let package_type: InitializeType = prompt_initialize_category(
                                    &mut line_editor, 
                                    &mut stdout, 
                                    matches,
                                    &dir_name,
                                )?.parse()?;
                                if package_type != InitializeType::Router {
                                    add_project_definition_to_package_json_mut(
                                        &mut package_json,
                                        &dir_name,
                                    )?;
                                }
                                let new_package_json_projects: HashSet<String> = package_json.workspaces.as_ref().unwrap_or(&vec![]).iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
                                let validation_result = validate_addition_to_artifact(
                                    &dir_name,
                                    &new_package_json_projects,
                                    &format!("Successfully added {} to package.json", dir_name),
                                    &format!("Package {} was not added to package.json", dir_name),
                                    "sync:677",
                                    &mut stdout,
                                )?;
                                if !validation_result {
                                    return Err(anyhow::anyhow!("Failed to add {} to package.json", dir_name));
                                }
                            }    
                        }
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to add to package.json")?;
                        stdout.reset()?;
                    }
                    application_package_json_buffer = Some(json_to_string_pretty(&package_json)?);
                }
            }
            rendered_templates.push(RenderedTemplate {
                path: modules_path.join("package.json"),
                content: application_package_json_buffer.unwrap(),
                context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
            });
            if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
                rendered_templates.push(RenderedTemplate {
                    path: modules_path.join("pnpm-workspace.yaml"),
                    content: pnpm_workspace_buffer,
                    context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                });
            }

            println!("sync:580 removing projects from universal SDK");
            let (mut sdk_ast_program_text, mut sdk_project_json) = read_universal_sdk_content(&modules_path)?;
            if !manifest_projects_to_remove.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in directories that are in universal SDK that no longer exist:", runtime_projects_to_remove.len())?;
                for project in &manifest_projects_to_remove {
                    writeln!(stdout, "  - {}", project)?;
                }
                stdout.reset()?;
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to remove these projects from universal SDK? (y/N) ")?;
                if continue_sync {
                    println!("sync:593 app_name: {:?}", manifest_data.app_name);
                    (sdk_ast_program_text, sdk_project_json) = remove_project_vec_from_universal_sdk(
                        &manifest_data.app_name,
                        &manifest_projects_to_remove,
                        &mut sdk_ast_program_text,
                        &mut sdk_project_json,
                    )?;
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No projects to remove from universal SDK")?;
                stdout.reset()?;
            }
            if !manifest_projects_to_add.is_empty() && !is_ci {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} package(s) in directories that are not in universal SDK:", manifest_projects_to_add.len())?;
                for package in &manifest_projects_to_add {
                    writeln!(stdout, "  - {}", package)?;
                }
                stdout.reset()?;
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to add these packages to universal SDK? (y/N) ")?;
                if continue_sync {
                    println!("sync:741 app_name: {:?}", manifest_data.app_name);
                    (sdk_ast_program_text, sdk_project_json) = add_project_vec_to_universal_sdk(
                        &manifest_data.app_name,
                        &manifest_projects_to_add,
                        &mut sdk_ast_program_text,
                        &mut sdk_project_json,
                    )?;
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No packages to add to universal SDK")?;
                stdout.reset()?;
            }

            
            rendered_templates.push(RenderedTemplate {
                path: modules_path.join("universal-sdk").join("universalSdk.ts"),
                content: sdk_ast_program_text,
                context: None,
            });
            rendered_templates.push(RenderedTemplate {
                path: modules_path.join("universal-sdk").join("package.json"),
                content: json_to_string_pretty(&sdk_project_json)?,
                context: None,
            });

            write_rendered_templates(&rendered_templates, false, &mut stdout)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "Successfully synced {} project(s)/package(s) from manifest, docker-compose.yml, and runtime files", manifest_projects_to_remove.len() + services_to_remove_docker.len() + runtime_projects_to_remove.len())?;
            stdout.reset()?;
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "No modules path configured in manifest")?;
            stdout.reset()?;
        }
        Ok(())
    }
}