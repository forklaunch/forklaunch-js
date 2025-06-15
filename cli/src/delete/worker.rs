use std::{
    fs::{read_to_string, remove_dir_all},
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_CREATE_PACKAGE_JSON, ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE, ERROR_FAILED_TO_WRITE_MANIFEST, Runtime,
    },
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        docker::remove_service_from_docker_compose,
        manifest::{
            ApplicationInitializationMetadata, InitializableManifestConfig,
            InitializableManifestConfigMetadata, ProjectType, application::ApplicationManifestData,
            remove_project_definition_from_manifest,
        },
        package_json::remove_project_definition_to_package_json,
        pnpm_workspace::remove_project_definition_to_pnpm_workspace,
        rendered_template::{RenderedTemplate, write_rendered_templates},
        universal_sdk::remove_project_from_universal_sdk,
    },
    prompt::{ArrayCompleter, prompt_for_confirmation, prompt_with_validation},
};

#[derive(Debug)]
pub(super) struct WorkerCommand;

impl WorkerCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for WorkerCommand {
    fn command(&self) -> Command {
        command("worker", "Initialize a new worker")
            .alias("wrkr")
            .arg(Arg::new("name").help("The name of the worker"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path to initialize the library in"),
            )
            .arg(
                Arg::new("continue")
                    .short('c')
                    .long("continue")
                    .help("Continue the eject operation")
                    .action(ArgAction::SetTrue),
            )
    }

    // pass token in from parent and perform get token above?
    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Anywhere,
            &BasePathType::Delete,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let mut manifest_data = toml::from_str::<ApplicationManifestData>(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let worker_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "worker name",
            None,
            |input: &str| {
                manifest_data
                    .projects
                    .iter()
                    .any(|project| project.name == input && project.r#type == ProjectType::Worker)
            },
            |_| "Worker not found".to_string(),
        )?;

        manifest_data = manifest_data.initialize(InitializableManifestConfigMetadata::Application(
            ApplicationInitializationMetadata {
                app_name: base_path.file_name().unwrap().to_string_lossy().to_string(),
                database: match manifest_data
                    .projects
                    .iter()
                    .find(|project| {
                        project.name == worker_name && project.r#type == ProjectType::Worker
                    })
                    .map(|project| project.resources.as_ref().unwrap())
                {
                    Some(resource_inventory) => resource_inventory.database.clone(),
                    None => None,
                },
            },
        ));

        let continue_delete_override = matches.get_flag("continue");

        if !continue_delete_override {
            let continue_delete = prompt_for_confirmation(
                &mut line_editor,
                "This operation is irreversible. Do you want to continue? (y/N) ",
            )?;

            if !continue_delete {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                writeln!(stdout, "Deletion cancelled")?;
                stdout.reset()?;
                return Ok(());
            }
        }

        let manifest_content =
            remove_project_definition_from_manifest(&mut manifest_data, &worker_name)?;

        remove_dir_all(&base_path.join(&worker_name))?;

        let docker_compose_path = base_path.join("docker-compose.yaml");
        let mut docker_compose = serde_yml::from_str(
            &read_to_string(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;
        remove_service_from_docker_compose(&mut docker_compose, &worker_name)?;

        let mut rendered_templates = vec![
            RenderedTemplate {
                path: config_path,
                content: manifest_content,
                context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
            },
            RenderedTemplate {
                path: docker_compose_path,
                content: serde_yml::to_string(&docker_compose)?,
                context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
            },
        ];

        match manifest_data.runtime.parse()? {
            Runtime::Node => {
                rendered_templates.push(RenderedTemplate {
                    path: base_path.join("pnpm-workspace.yaml"),
                    content: remove_project_definition_to_pnpm_workspace(base_path, &worker_name)?,
                    context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                });
            }
            Runtime::Bun => {
                rendered_templates.push(RenderedTemplate {
                    path: base_path.join("package.json"),
                    content: remove_project_definition_to_package_json(base_path, &worker_name)?,
                    context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
                });
            }
        }

        remove_project_from_universal_sdk(
            &mut rendered_templates,
            base_path,
            &manifest_data.app_name,
            &worker_name,
        )?;

        write_rendered_templates(&rendered_templates, false, &mut stdout)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} deleted successfully!", worker_name)?;
        stdout.reset()?;

        Ok(())
    }
}
