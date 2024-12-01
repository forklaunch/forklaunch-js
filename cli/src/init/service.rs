use std::{
    env::{current_dir, current_exe},
    fs::{read_to_string, write},
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use ramhorns::{Content, Ramhorns};
use serde::{Deserialize, Serialize};
use toml::from_str;

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE, ERROR_FAILED_TO_CREATE_GITIGNORE,
        ERROR_FAILED_TO_CREATE_SYMLINKS, ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_GET_CWD,
        ERROR_FAILED_TO_GET_EXE_WD, ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
    },
};

use super::{
    core::{
        config::ProjectConfig,
        docker::add_service_definition_to_docker_compose,
        gitignore::setup_gitignore,
        manifest::add_project_definition_to_manifest,
        package_json::add_project_definition_to_package_json,
        pnpm_workspace::add_project_definition_to_pnpm_workspace,
        symlinks::setup_symlinks,
        template::{setup_with_template, PathIO},
        tsconfig::setup_tsconfig,
    },
    forklaunch_command, CliCommand,
};

config_struct!(
    #[derive(Debug, Content, Serialize)]
    pub(crate) struct ServiceConfigData {
        pub(crate) service_name: String,
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
                    .required(false)
                    .help("The application path to initialize the service in."),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let service_name = matches.get_one::<String>("name").unwrap();
        let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;
        let base_path = match matches.get_one::<String>("base_path") {
            Some(path) => path,
            None => current_path.to_str().unwrap(),
        };

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let mut config_data: ServiceConfigData =
            from_str(&read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        config_data.service_name = service_name.clone();

        setup_basic_service(service_name, &base_path.to_string(), &mut config_data)
            .with_context(|| "Failed to create service.")?;
        Ok(())
    }
}

fn setup_basic_service(
    service_name: &String,
    base_path: &String,
    config_data: &mut ServiceConfigData,
) -> Result<()> {
    let output_path = Path::new(base_path)
        .join(service_name)
        .to_string_lossy()
        .to_string();
    let template_dir = PathIO {
        input_path: Path::new("templates")
            .join("project")
            .join("service")
            .to_string_lossy()
            .to_string(),
        output_path: output_path.clone(),
    };
    let mut template = Ramhorns::lazy(
        current_exe()
            .with_context(|| ERROR_FAILED_TO_GET_EXE_WD)?
            .parent()
            .unwrap(),
    )?;

    let ignore_files = vec![];

    setup_with_template(
        None,
        &template_dir,
        &mut template,
        config_data,
        &ignore_files,
    )?;
    setup_symlinks(Some(base_path), &template_dir.output_path, config_data)
        .with_context(|| ERROR_FAILED_TO_CREATE_SYMLINKS)?;
    setup_tsconfig(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_TSCONFIG)?;
    setup_gitignore(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?;

    add_service_to_artifacts(config_data, base_path)
        .with_context(|| "Failed to add service metadata to artifacts.")?;

    Ok(())
}

fn add_service_to_artifacts(config_data: &mut ServiceConfigData, base_path: &String) -> Result<()> {
    let (docker_compose_buffer, port_number) =
        add_service_definition_to_docker_compose(config_data, base_path)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    let forklaunch_definition_buffer =
        add_project_definition_to_manifest(config_data, Some(port_number))
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

    write(
        Path::new(base_path).join("docker-compose.yml"),
        docker_compose_buffer,
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    write(
        Path::new(base_path)
            .join(".forklaunch")
            .join("manifest.toml"),
        forklaunch_definition_buffer,
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;
    if let Some(package_json_buffer) = package_json_buffer {
        write(
            Path::new(base_path).join("package.json"),
            package_json_buffer,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?;
    }
    if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
        write(
            Path::new(base_path).join("pnpm-workspace.yml"),
            pnpm_workspace_buffer,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?;
    }

    Ok(())
}
