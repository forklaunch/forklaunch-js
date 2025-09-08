use std::{
    fs::{read_to_string, remove_dir_all},
    io::Write,
    path::PathBuf,
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
        command::command,
        docker::remove_service_from_docker_compose,
        flexible_path::create_generic_config,
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
pub(super) struct ServiceCommand;

impl ServiceCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ServiceCommand {
    fn command(&self) -> Command {
        command("service", "Initialize a new service")
            .alias("svc")
            .arg(Arg::new("name").help("The name of the service"))
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

        let current_dir = std::env::current_dir().unwrap();
        let service_base_path = if let Some(relative_path) = matches.get_one::<String>("base_path")
        {
            current_dir.join(relative_path)
        } else {
            current_dir
        };

        let root_path_config = create_generic_config();
        let config_path = crate::core::base_path::resolve_app_base_path_and_find_manifest(
            matches,
            &root_path_config,
        )?;
        let app_root_path: PathBuf = config_path
            .to_string_lossy()
            .strip_suffix(".forklaunch/manifest.toml")
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Expected manifest path to end with .forklaunch/manifest.toml, got: {:?}",
                    config_path
                )
            })?
            .to_string()
            .into();

        let mut manifest_data = toml::from_str::<ApplicationManifestData>(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let service_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "service name",
            None,
            |input: &str| {
                manifest_data
                    .projects
                    .iter()
                    .any(|project| project.name == input && project.r#type == ProjectType::Service)
            },
            |_| "Service not found".to_string(),
        )?;

        manifest_data = manifest_data.initialize(InitializableManifestConfigMetadata::Application(
            ApplicationInitializationMetadata {
                app_name: app_root_path
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_string(),
                database: match manifest_data
                    .projects
                    .iter()
                    .find(|project| {
                        project.name == service_name && project.r#type == ProjectType::Service
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
            remove_project_definition_from_manifest(&mut manifest_data, &service_name)?;

        remove_dir_all(&service_base_path.join(&service_name))?;

        let docker_compose_path =
            if let Some(docker_compose_path) = &manifest_data.docker_compose_path {
                app_root_path.join(docker_compose_path)
            } else {
                app_root_path.join("docker-compose.yaml")
            };
        let mut docker_compose = serde_yml::from_str(
            &read_to_string(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;
        remove_service_from_docker_compose(&mut docker_compose, &service_name)?;

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
                    path: service_base_path.join("pnpm-workspace.yaml"),
                    content: remove_project_definition_to_pnpm_workspace(
                        &service_base_path,
                        &service_name,
                    )?,
                    context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                });
            }
            Runtime::Bun => {
                rendered_templates.push(RenderedTemplate {
                    path: service_base_path.join("package.json"),
                    content: remove_project_definition_to_package_json(
                        &service_base_path,
                        &service_name,
                    )?,
                    context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
                });
            }
        }

        remove_project_from_universal_sdk(
            &mut rendered_templates,
            &app_root_path,
            &manifest_data.app_name,
            &service_name,
        )?;

        write_rendered_templates(&rendered_templates, false, &mut stdout)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} deleted successfully!", service_name)?;
        stdout.reset()?;

        Ok(())
    }
}
