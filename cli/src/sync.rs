use std::{fs, path::{Path, PathBuf}, io::{self, Write}};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use rustyline::completion::ArrayCompleter;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use walkdir::WalkDir;

use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
        ERROR_FAILED_TO_WRITE_MANIFEST,
        ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE,
        Runtime::{Bun, Node},
    },
    base_path::{RequiredLocation, find_app_root_path},
    core::{
        command::command,
        manifest::{
            application::ApplicationManifestData,
            InitializableManifestConfigMetadata,
            ApplicationInitializationMetadata,
            remove_project_definition_from_manifest,
            ProjectType::{Service, Worker},
        },
        docker::{
            remove_service_from_docker_compose, remove_worker_from_docker_compose,
        },
        package_json::{application_package_json::ApplicationPackageJson, remove_project_definition_to_package_json},
        pnpm_workspace::{PnpmWorkspace, remove_project_definition_to_pnpm_workspace},
        rendered_template::{RenderedTemplate, write_rendered_templates},
    },
    prompt::{prompt_for_confirmation, ArrayCompleter},
};

#[derive(Debug)]
pub(crate) struct SyncCommand;

impl SyncCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

fn find_project_dirs(modules_path: &Path) -> Result<Vec<PathBuf>> {
    let mut project_dirs = vec![];
    
    if !modules_path.exists() {
        return Ok(project_dirs);
    }
    
    for entry in fs::read_dir(modules_path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            if let Some(dir_name) = entry.path().file_name() {
                if dir_name.to_string_lossy().to_string() != "node_modules" {
                    project_dirs.push(entry.path());
                }
            }
        }
    }
    Ok(project_dirs)
}

impl CliCommand for SyncCommand {
    fn command(&self) -> Command {
        command(
            "sync",
            "Sync manifest with application files",
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

        let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");
        
        // Read in manifest.toml
        let existing_manifest_data = toml::from_str::<ApplicationManifestData>(
            &fs::read_to_string(&manifest_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        
        let mut manifest_data = existing_manifest_data.initialize(
            InitializableManifestConfigMetadata::Application(ApplicationInitializationMetadata {
                app_name: existing_manifest_data.app_name.clone(),
                database: None,
            }),
        );

        let modules_path = manifest_data
            .modules_path
            .as_ref()
            .map(|path| app_root_path.join(path));
        
        // Read in docker-compose.yml
        let docker_compose_path = if app_root_path.join("docker-compose.yml").exists() {
            app_root_path.join("docker-compose.yml")
        } else {
            return Err(anyhow::anyhow!(
                "docker-compose.yml not found in {}",
                app_root_path.display()
            ));
        };

        let mut docker_compose = serde_yml::from_str(
            &read_to_string(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;

        println!("Here we begin the sync operations. Starting with manifest.toml");
        if let Some(modules_path) = modules_path {
            let project_dirs = find_project_dirs(&modules_path)?;
            println!("project_dirs: {:?}", project_dirs);
            
            // manifest.toml
            let manifest_project_names: Vec<String> = manifest_data.projects
                .iter()
                .map(|project| project.name.clone())
                .collect();
            println!("manifest_project_names: {:?}", manifest_project_names);
            
            // project names in directories
            let dir_project_names: Vec<String> = project_dirs
                .iter()
                .filter_map(|path| path.file_name())
                .filter_map(|name| name.to_str())
                .map(|name| name.to_string())
                .collect();
            
            // List of names filtered from manifest.toml that are not in directories
            let projects_to_remove: Vec<String> = manifest_project_names
                .iter()
                .filter(|project_name| !dir_project_names.contains(project_name))
                .cloned()
                .collect();
            let projects_to_add: Vec<String> = dir_project_names
                .iter()
                .filter(|project_name| !manifest_project_names.contains(project_name))
                .cloned()
                .collect();
            
            if !projects_to_remove.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in manifest that no longer exist in directories:", projects_to_remove.len())?;
                for project_name in &projects_to_remove {
                    writeln!(stdout, "  - {}", project_name)?;
                }
                stdout.reset()?;
                
                let confirm_override = matches.get_flag("confirm");
                if !confirm_override {
                    let continue_sync = prompt_for_confirmation(
                        &mut line_editor,
                        "Do you want to remove these projects from the manifest? (y/N) ",
                    )?;
                    
                    if !continue_sync {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                        writeln!(stdout, "Sync cancelled")?;
                        stdout.reset()?;
                        return Ok(());
                    }
                }
                
                // remove projects from manifest.toml
                for project_name in &projects_to_remove {
                    remove_project_definition_from_manifest(&mut manifest_data, project_name)?;
                }
                
                let manifest_content = toml::to_string_pretty(&manifest_data)
                    .with_context(|| ERROR_FAILED_TO_WRITE_MANIFEST)?;

                let mut rendered_templates = vec![
                    RenderedTemplate {
                        path: manifest_path.clone(),
                        content: manifest_content,
                        context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
                    },
                ];
                

                // remove projects from docker-compose.yml
                let docker_services = docker_compose.services
                    .iter_mut()
                    .filter(|(_, service)| service.name != project_name)
                    .collect();
                let docker_workers = docker_compose.services
                    .iter_mut()
                    .filter(|(_, worker)| worker.name != format!("{}-{}", project_name, "server"))
                    .filter(|(_, worker)| worker.name != format!("{}-{}", project_name, "worker"))
                    .collect();
                let services_to_remove_docker = docker_services
                    .iter()
                    .map(|(_, service)| service.name)
                    .collect();
                let workers_to_remove_docker = docker_workers
                    .iter().map(|(_, worker)| worker.name)
                    .collect();
                for service in services_to_remove_docker {
                    remove_service_from_docker_compose(&mut docker_compose, &service)?;
                }
                for worker in workers_to_remove_docker {
                    remove_worker_from_docker_compose(&mut docker_compose, &worker)?;
                }

                let mut rendered_templates = vec![
                    RenderedTemplate {
                        path: manifest_path,
                        content: manifest_content,
                        context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
                    },
                    RenderedTemplate {
                        path: docker_compose_path,
                        content: serde_yml::to_string(&docker_compose)?,
                        context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
                    },
                ];
                
                // remove projects from pnpm-workspace.yaml and package.json
                match manifest_data.runtime.parse()? {
                    Runtime::Node => {
                        let updated_pnpm_workspace = remove_project_definition_to_pnpm_workspace(
                            &modules_path,
                            &project_name,
                        )?;
                        rendered_templates.push(RenderedTemplate {
                            path: modules_path.join("pnpm-workspace.yaml"),
                            content: updated_pnpm_workspace,
                            context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                        });
                    }
                    Runtime::Bun => {
                        let updated_package_json = remove_project_definition_to_package_json(
                            &modules_path,
                            &project_name,
                        )?;
                        rendered_templates.push(RenderedTemplate {
                            path: modules_path.join("package.json"),
                            content: updated_package_json,
                            context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
                        });
                    }
                }

                write_rendered_templates(&rendered_templates, false, &mut stdout)?;

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Successfully removed {} project(s) from manifest, docker-compose.yml, and pnpm-workspace.yaml", projects_to_remove.len())?;
                stdout.reset()?;

            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Manifest is already in sync with project directories")?;
                stdout.reset()?;
            }

            if !projects_to_add.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in directories that are not in manifest:", projects_to_add.len())?;
                for project_name in &projects_to_add {
                    writeln!(stdout, "  - {}", project_name)?;
                }
                stdout.reset()?;

                let confirm_override = matches.get_flag("confirm");
                if !confirm_override {
                    let continue_sync = prompt_for_confirmation(
                        &mut line_editor,
                        "Do you want to add these projects to the manifest? (y/N) ",
                    )?;

                    if !continue_sync {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                        writeln!(stdout, "Sync cancelled")?;
                        stdout.reset()?;
                        return Ok(());
                    } else {
                        // add projects to manifest.toml
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "Adding {} project(s) to manifest", projects_to_add.len())?;
                        stdout.reset()?;
                        // prompt user for project type and description
                        let project_type = prompt_with_validation(
                            &mut line_editor,
                            &mut stdout,
                            "project_type",
                            matches,
                            "project_type",
                            Some(["Service", "Library", "Worker"]),
                            |input| ["Service", "Library", "Worker"].contains(&input),
                            |_| "Invalid project type. Please try again".to_string(),
                        )?;

                        // TODO: add project to manifest.toml
                    }
                }

            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Manifest is already in sync with project directories")?;
                stdout.reset()?;
            }
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "No modules path configured in manifest")?;
            stdout.reset()?;
        }
        
        


        Ok(())
    }
}