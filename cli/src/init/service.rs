use std::{env::current_dir, fs::read_to_string, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgMatches, Command};
use ramhorns::Content;
use rustyline::{history::DefaultHistory, DefaultEditor, Editor};
use serde::{Deserialize, Serialize};
use termcolor::{ColorChoice, StandardStream};
use toml::from_str;

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE, ERROR_FAILED_TO_CREATE_GITIGNORE,
        ERROR_FAILED_TO_CREATE_SYMLINKS, ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_GET_CWD,
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST, VALID_DATABASES,
    },
    prompt::{prompt_with_validation, prompt_without_validation, ArrayCompleter},
};

use super::{
    core::{
        config::ProjectConfig,
        database::match_database,
        docker::add_service_definition_to_docker_compose,
        gitignore::generate_gitignore,
        manifest::add_project_definition_to_manifest,
        package_json::{add_project_definition_to_package_json, update_application_package_json},
        pnpm_workspace::add_project_definition_to_pnpm_workspace,
        rendered_template::{write_rendered_templates, RenderedTemplate},
        symlinks::generate_symlinks,
        template::{generate_with_template, PathIO, TemplateConfigData},
        tsconfig::generate_tsconfig,
    },
    forklaunch_command, CliCommand,
};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct ServiceConfigData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) service_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) db_driver: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mongo: bool,
    }
);

impl ProjectConfig for ServiceConfigData {
    fn name(&self) -> &String {
        &self.service_name
    }
}

#[derive(Debug)]
pub(super) struct ServiceCommand;

impl ServiceCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ServiceCommand {
    fn command(&self) -> Command {
        forklaunch_command("service", "Initialize a new service")
            .alias("svc")
            .alias("project")
            .alias("proj")
            .arg(
                Arg::new("name")
                    .required(true)
                    .help("The name of the application"),
            )
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path to initialize the service in"),
            )
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .required(true)
                    .help("The database to use")
                    .value_parser(VALID_DATABASES),
            )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the service"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let service_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "Enter service name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Service name cannot be empty. Please try again".to_string(),
        )?;

        let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;
        let base_path = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "base_path",
            matches,
            "Enter base path (optional, press enter for current directory): ",
        )?;
        let base_path = if base_path.trim().is_empty() {
            current_path.to_str().unwrap().to_string()
        } else {
            base_path
        };

        let database = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "database",
            matches,
            "Enter database type",
            Some(&VALID_DATABASES),
            |input| VALID_DATABASES.contains(&input),
            |_| "Invalid database type. Please try again".to_string(),
        )?;

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "Enter service description (optional): ",
        )?;

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let mut config_data: ServiceConfigData = ServiceConfigData {
            service_name: service_name.clone(),
            description: description.clone(),
            database: database.clone(),
            db_driver: match_database(&database),
            is_mongo: database == "mongodb",
            is_postgres: database == "postgresql",

            ..from_str(&read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        };

        generate_basic_service(&service_name, &base_path.to_string(), &mut config_data)
            .with_context(|| "Failed to create service")?;
        Ok(())
    }
}

fn generate_basic_service(
    service_name: &String,
    base_path: &String,
    config_data: &mut ServiceConfigData,
) -> Result<()> {
    let output_path = Path::new(base_path)
        .join(service_name)
        .to_string_lossy()
        .to_string();
    let template_dir = PathIO {
        input_path: Path::new("project")
            .join("service")
            .to_string_lossy()
            .to_string(),
        output_path: output_path.clone(),
    };

    let ignore_files = vec![];

    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &TemplateConfigData::Service(config_data.clone()),
        &ignore_files,
    )?;
    rendered_templates
        .extend(generate_tsconfig(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_TSCONFIG)?);
    rendered_templates.extend(
        generate_gitignore(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?,
    );
    rendered_templates.extend(
        add_service_to_artifacts(config_data, base_path)
            .with_context(|| "Failed to add service metadata to artifacts")?,
    );
    rendered_templates.extend(
        update_application_package_json(config_data, base_path)
            .with_context(|| "Failed to update application package.json")?,
    );

    write_rendered_templates(&rendered_templates)
        .with_context(|| "Failed to write service files")?;

    generate_symlinks(Some(base_path), &template_dir.output_path, config_data)
        .with_context(|| ERROR_FAILED_TO_CREATE_SYMLINKS)?;

    Ok(())
}

fn add_service_to_artifacts(
    config_data: &mut ServiceConfigData,
    base_path: &String,
) -> Result<Vec<RenderedTemplate>> {
    let (docker_compose_buffer, port_number) =
        add_service_definition_to_docker_compose(config_data, base_path)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    let forklaunch_definition_buffer = add_project_definition_to_manifest(
        config_data,
        Some(port_number),
        Some(config_data.database.to_owned()),
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;
    let mut package_json_buffer: Option<String> = None;
    if config_data.runtime == "bun" {
        package_json_buffer = Some(
            add_project_definition_to_package_json(config_data, base_path)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
        );
    }
    let mut pnpm_workspace_buffer: Option<String> = None;
    if config_data.runtime == "node" {
        pnpm_workspace_buffer = Some(
            add_project_definition_to_pnpm_workspace(base_path, config_data)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
        );
    }

    let mut rendered_templates = Vec::new();

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path).join("docker-compose.yaml"),
        content: docker_compose_buffer,
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .join(".forklaunch")
            .join("manifest.toml"),
        content: forklaunch_definition_buffer,
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST.to_string()),
    });

    if let Some(package_json_buffer) = package_json_buffer {
        rendered_templates.push(RenderedTemplate {
            path: Path::new(base_path).join("package.json"),
            content: package_json_buffer,
            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON.to_string()),
        });
    }
    if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
        rendered_templates.push(RenderedTemplate {
            path: Path::new(base_path).join("pnpm-workspace.yaml"),
            content: pnpm_workspace_buffer,
            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE.to_string()),
        });
    }

    Ok(rendered_templates)
}
