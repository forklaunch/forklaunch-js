use std::{
    env::{current_dir, current_exe},
    fs::read_to_string,
    path::Path,
};

use anyhow::Result;
use clap::{Arg, ArgMatches, Command};
use ramhorns::{Content, Ramhorns};
use serde::{Deserialize, Serialize};
use toml::from_str;

use crate::config_struct;

use super::{
    forklaunch_command, setup_gitignore, setup_symlinks, setup_tsconfig, setup_with_template,
    CliCommand, PathIO,
};

config_struct!(
    #[derive(Debug, Content, Serialize)]
    struct ServiceConfigData {
        service_name: String,
    }
);

// impl<'de> Deserialize<'de> for ServiceConfigData {
//     fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
//     where
//         D: serde::Deserializer<'de>,
//     {
//         let mut data: ServiceConfigData = Deserialize::deserialize(deserializer)?;
//         data.is_express = data.http_framework == "express";
//         data.is_hyper_express = data.http_framework == "hyper-express";
//         data.is_zod = data.validator == "zod";
//         data.is_typebox = data.validator == "typebox";
//         data.is_bun = data.runtime == "bun";
//         data.is_node = data.runtime == "node";
//         data.is_vitest = data.test_framework == "vitest";
//         data.is_jest = data.test_framework == "jest";
//         Ok(data)
//     }
// }

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
        let current_path = current_dir()?;
        let base_path = match matches.get_one::<String>("base_path") {
            Some(path) => path,
            None => current_path.to_str().unwrap(),
        };

        let config_path = Path::new(&base_path).join(".forklaunch/config.toml");

        let mut config_data: ServiceConfigData = from_str(&read_to_string(config_path)?)?;
        config_data.service_name = service_name.clone();

        setup_basic_service(service_name, &base_path.to_string(), &config_data)?;
        Ok(())
    }
}

fn setup_basic_service(
    service_name: &String,
    base_path: &String,
    config_data: &ServiceConfigData,
) -> Result<()> {
    let output_path = Path::new(base_path)
        .join(service_name)
        .to_string_lossy()
        .to_string();
    let template_dir = PathIO {
        input_path: "templates/project/service".to_string(),
        output_path: output_path.clone(),
    };
    let mut template = Ramhorns::lazy(current_exe()?.parent().unwrap())?;

    let ignore_files = vec![];

    setup_with_template(
        None,
        &template_dir,
        &mut template,
        config_data,
        &ignore_files,
    )?;
    setup_symlinks(Some(base_path), &template_dir.output_path, config_data)?;
    setup_tsconfig(&output_path)?;
    setup_gitignore(&output_path)?;

    Ok(())
}
