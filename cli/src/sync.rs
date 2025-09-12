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
    },
    base_path::{RequiredLocation, find_app_root_path},
    core::{
        command::command,
        manifest::{
            application::ApplicationManifestData,
            InitializableManifestConfigMetadata,
            ApplicationInitializationMetadata,
            remove_project_definition_from_manifest,
        },
    },
    docker::docker_compose::DockerCompose,
    package_json::application_package_json::ApplicationPackageJson,
    pnpm_workspace::PnpmWorkspace,
    rendered_template::{RenderedTemplate, RenderedTemplatesCache},
    watermark::apply_watermark,
    prompt::prompt_for_confirmation,
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
        // manifest.toml
        let modules_path = manifest_data
            .modules_path
            .as_ref()
            .map(|path| app_root_path.join(path));

        if let Some(modules_path) = modules_path {
            let project_dirs = find_project_dirs(&modules_path)?;
            
            
            let manifest_project_names: Vec<String> = manifest_data.projects
                .iter()
                .map(|project| project.name.clone())
                .collect();
            
            
            let dir_project_names: Vec<String> = project_dirs
                .iter()
                .filter_map(|path| path.file_name())
                .filter_map(|name| name.to_str())
                .map(|name| name.to_string())
                .collect();
            
            
            let projects_to_remove: Vec<String> = manifest_project_names
                .iter()
                .filter(|project_name| !dir_project_names.contains(project_name))
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
                
                
                for project_name in &projects_to_remove {
                    remove_project_definition_from_manifest(&mut manifest_data, project_name)?;
                }
                
                
                let updated_manifest_content = toml::to_string_pretty(&manifest_data)
                    .with_context(|| ERROR_FAILED_TO_WRITE_MANIFEST)?;
                
                fs::write(&manifest_path, updated_manifest_content)
                    .with_context(|| ERROR_FAILED_TO_WRITE_MANIFEST)?;
                
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Successfully removed {} project(s) from manifest", projects_to_remove.len())?;
                stdout.reset()?;
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
        // docker-compose.yml
        let docker_compose_path = app_root_path.join("docker-compose.yml");

        let docker_compose = DockerCompose::from_path(&docker_compose_path)
            .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?;
        // pnpm-workspace.yaml
        let pnpm_workspace_path = app_root_path.join("pnpm-workspace.yaml");

        let pnpm_workspace = PnpmWorkspace::from_path(&pnpm_workspace_path)
            .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?;
        // package.json
        let package_json_path = app_root_path.join("package.json");

        let package_json = ApplicationPackageJson::from_path(&package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;


        Ok(())
    }
}