use std::{collections::HashMap, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use ramhorns::Content;
use serde::{Deserialize, Serialize};

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_CREATE_GITIGNORE, ERROR_FAILED_TO_CREATE_LICENSE,
        ERROR_FAILED_TO_CREATE_PNPM_WORKSPACE, ERROR_FAILED_TO_SETUP_IAM, LATEST_CLI_VERSION,
    },
    utils::get_token,
};

use super::{
    core::{
        config::ProjectEntry,
        database::{match_database, VALID_DATABASES},
        gitignore::setup_gitignore,
        iam::setup_iam,
        license::setup_license,
        manifest::setup_manifest,
        pnpm_workspace::generate_pnpm_workspace,
        symlinks::setup_symlinks,
        template::{setup_with_template, PathIO, TemplateConfigData},
    },
    forklaunch_command,
    service::ServiceConfigData,
    CliCommand,
};

config_struct!(
    #[derive(Debug, Serialize, Content, Clone)]
    pub(crate) struct ApplicationConfigData {
        #[serde(skip_serializing, skip_deserializing)]
        database: String,
        #[serde(skip_serializing, skip_deserializing)]
        description: String,

        #[serde(skip_serializing, skip_deserializing)]
        is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        is_mongo: bool,
        #[serde(skip_serializing, skip_deserializing)]
        bun_package_json_workspace_string: Option<String>,
    }
);

#[derive(Debug)]
pub(super) struct ApplicationCommand {}

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ApplicationCommand {
    // TODO: Add support for biome
    fn command(&self) -> Command {
        forklaunch_command("application", "Initialize a new full monorepo application")
        .alias("app")
        .arg(
            Arg::new("name")
                .required(true)
                .help("The name of the application"),
        )
        .arg(
            Arg::new("database")
                .short('d')
                .long("database")
                .required(true)
                // .help("The database to use. Valid values = [sqlite, postgresql, mysql, mongodb]")
                // .value_parser(["sqlite", "postgresql", "mysql", "mongodb"]),
                .help("The database to use. Valid values = [postgresql, mongodb]")
                .value_parser(VALID_DATABASES),
        )
        .arg(
            Arg::new("validator")
                .short('v')
                .long("validator")
                .required(true)
                .help("The validator to use. Valid values = [zod, typebox]")
                .value_parser(["zod", "typebox"]),
        )
        .arg(
            Arg::new("http-framework")
                .short('f')
                .long("http-framework")
                .required(true)
                .help("The framework to use. Valid values = [express, hyper-express]. Note hyper-express only supports node.")
                .value_parser(["express", "hyper-express"]),
        )
        .arg(
            Arg::new("runtime")
                .short('r')
                .long("runtime")
                .required(true)
                .help("The runtime to use. Valid values = [node, bun]")
                .value_parser(["node", "bun"]),
        )
        .arg(
            Arg::new("test-framework")
                .short('t')
                .long("test-framework")
                .required(true)
                .help("The test framework to use. Valid values = [vitest, jest]")
                .value_parser(["vitest", "jest"]),
        )
        .arg(
            Arg::new("packages")
                .short('p')
                .long("packages")
                .help("Additional packages to include. Valid values = [billing, iam]")
                .value_parser(["billing", "iam"])
                .num_args(0..)
                .action(ArgAction::Append),
        )
        .arg(
            Arg::new("libraries")
                .short('l')
                .long("libraries")
                .help("Additional libraries to include. Valid values = [monitoring]")
                .value_parser(["monitoring"])
                .num_args(0..)
                .action(ArgAction::Append),
        )
        .arg(Arg::new("description").short('D').long("description").help("The description of the application"))
        .arg(Arg::new("author").short('A').long("author").required(true).help("The author of the application"))
        .arg(Arg::new("license").short('L').long("license").required(true).help("The license of the application").value_parser(["apgl", "gpl", "lgpl", "mozilla", "apache", "mit", "boost", "unlicense", "none"]))
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let name = matches.get_one::<String>("name").unwrap();
        let database = matches.get_one::<String>("database").unwrap();
        let validator = matches.get_one::<String>("validator").unwrap();
        let http_framework = matches.get_one::<String>("http-framework").unwrap();
        let runtime = matches.get_one::<String>("runtime").unwrap();
        let test_framework = matches.get_one::<String>("test-framework").unwrap();
        let packages = matches.get_many::<String>("packages").unwrap_or_default();
        let description = match matches.get_one::<String>("description") {
            Some(description) => description,
            None => &"".to_string(),
        };
        let author = matches.get_one::<String>("author").unwrap();
        let license = match matches
            .get_one::<String>("license")
            .unwrap()
            .to_lowercase()
            .as_str()
        {
            "apgl" => "AGPL-3.0".to_string(),
            "gpl" => "GPL-3.0".to_string(),
            "lgpl" => "LGPL-3.0".to_string(),
            "mozilla" => "MPL-2.0".to_string(),
            "apache" => "Apache-2.0".to_string(),
            "mit" => "MIT".to_string(),
            "boost" => "BSL-1.0".to_string(),
            "unlicense" => "Unlicense".to_string(),
            "none" => "UNLICENSED".to_string(),
            _ => bail!("Invalid license"),
        };
        // TODO: Add support for libraries
        // let libraries = matches.get_many::<String>("libraries").unwrap_or_default();

        let mut ignore_files = vec!["pnpm-workspace.yaml", "pnpm-lock.yml"];

        // TODO: maybe abstract this into a function
        let all_test_framework_config_files = vec!["vitest.config.ts", "jest.config.ts"];
        let test_framework_config_file = match test_framework.as_str() {
            "vitest" => "vitest.config.ts",
            "jest" => "jest.config.ts",
            _ => bail!("Invalid test framework: {}", test_framework),
        };
        ignore_files.extend(
            all_test_framework_config_files
                .into_iter()
                .filter(|config| config != &test_framework_config_file),
        );

        if runtime == "bun" && http_framework == "hyper-express" {
            bail!("Hyper Express is not supported for bun");
        }

        // TODO: Include basic token checks (expiration, permissions mapping) in this method, but retrieve token from parent command
        let _token = get_token()?;

        // Inline specific perms checks here. Make remote calls to receive templates for specific packages if needed here (premium only).

        let mut additional_projects = vec![ProjectEntry {
            name: "core".to_string(),
            port: None,
            database: None,
        }];
        let port_number = 8000;
        additional_projects.extend(packages.enumerate().map(|(i, package)| ProjectEntry {
            name: package.to_string(),
            port: Some((port_number + i).try_into().unwrap()),
            database: Some(database.to_string()),
        }));

        let additional_projects_names = additional_projects
            .clone()
            .into_iter()
            .map(|p| p.name.clone())
            .collect::<Vec<String>>();

        let mut project_peer_topology = HashMap::new();
        project_peer_topology.insert(name.to_string(), additional_projects_names.clone());

        let bun_package_json_workspace_string = match runtime.as_str() {
            "bun" => Some(
                additional_projects_names
                    .iter()
                    .map(|p| format!("\"{}\"", p))
                    .collect::<Vec<String>>()
                    .join(", "),
            ),
            _ => None,
        };

        let mut data = ApplicationConfigData {
            cli_version: LATEST_CLI_VERSION.to_string(),
            database: database.to_string(),
            app_name: name.to_string(),
            validator: validator.to_string(),
            http_framework: http_framework.to_string(),
            runtime: runtime.to_string(),
            test_framework: test_framework.to_string(),
            projects: additional_projects.clone(),
            project_peer_topology,
            description: description.to_string(),
            author: author.to_string(),
            license: license.to_string(),

            is_express: http_framework == "express",
            is_hyper_express: http_framework == "hyper-express",
            is_zod: validator == "zod",
            is_typebox: validator == "typebox",
            is_bun: runtime == "bun",
            is_node: runtime == "node",
            is_vitest: test_framework == "vitest",
            is_jest: test_framework == "jest",

            is_postgres: database == "postgresql",
            is_mongo: database == "mongodb",

            bun_package_json_workspace_string,
        };

        setup_manifest(&Path::new(name).to_string_lossy().to_string(), &data)
            .with_context(|| "Failed to setup manifest file for application.")?;

        // TODO: support different path delimiters
        let mut template_dirs = vec![];

        let additional_projects_dirs = additional_projects.clone().into_iter().map(|path| PathIO {
            input_path: Path::new("project")
                .join(&path.name)
                .to_string_lossy()
                .to_string(),
            output_path: path.name,
        });
        template_dirs.extend(additional_projects_dirs.clone());

        setup_with_template(
            Some(name),
            &PathIO {
                input_path: Path::new("application").to_string_lossy().to_string(),
                output_path: "".to_string(),
            },
            &TemplateConfigData::Application(data.clone()),
            &ignore_files
                .iter()
                .map(|ignore_file| ignore_file.to_string())
                .collect::<Vec<String>>(),
        )?;

        for template_dir in template_dirs {
            setup_with_template(
                Some(name),
                &template_dir,
                &TemplateConfigData::Service(ServiceConfigData {
                    cli_version: data.cli_version.clone(),
                    app_name: data.app_name.clone(),
                    service_name: template_dir.output_path.to_string(),
                    validator: data.validator.clone(),
                    http_framework: data.http_framework.clone(),
                    runtime: data.runtime.clone(),
                    test_framework: data.test_framework.clone(),
                    projects: data.projects.clone(),
                    project_peer_topology: data.project_peer_topology.clone(),
                    author: data.author.clone(),
                    description: data.description.clone(),
                    license: data.license.clone(),

                    is_express: data.is_express,
                    is_hyper_express: data.is_hyper_express,
                    is_zod: data.is_zod,
                    is_typebox: data.is_typebox,
                    is_bun: data.is_bun,
                    is_node: data.is_node,
                    is_vitest: data.is_vitest,
                    is_jest: data.is_jest,
                    is_postgres: database == "postgresql",
                    is_mongo: database == "mongodb",

                    database: database.to_string(),
                    db_driver: match_database(&database),
                }),
                &ignore_files
                    .iter()
                    .map(|ignore_file| ignore_file.to_string())
                    .collect::<Vec<String>>(),
            )?;
        }

        additional_projects_dirs
            .into_iter()
            .try_for_each(|template_dir| {
                setup_symlinks(
                    Some(name),
                    &Path::new(name)
                        .join(&template_dir.output_path)
                        .to_string_lossy()
                        .to_string(),
                    &mut data,
                )
            })?;

        if runtime == "node" {
            generate_pnpm_workspace(name, &additional_projects)
                .with_context(|| ERROR_FAILED_TO_CREATE_PNPM_WORKSPACE)?;
        }

        if additional_projects_names.contains(&"iam".to_string()) {
            setup_iam(&Path::new(name)).with_context(|| ERROR_FAILED_TO_SETUP_IAM)?;
        }

        setup_license(&Path::new(name).to_string_lossy().to_string(), &data)
            .with_context(|| ERROR_FAILED_TO_CREATE_LICENSE)?;

        setup_gitignore(&Path::new(name).to_string_lossy().to_string())
            .with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?;

        Ok(())
    }
}
