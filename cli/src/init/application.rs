use std::{collections::HashMap, io::Write, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use ramhorns::Content;
use rustyline::{history::DefaultHistory, Editor};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use uuid::Uuid;

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_CREATE_GITIGNORE, ERROR_FAILED_TO_CREATE_LICENSE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE, ERROR_FAILED_TO_SETUP_IAM, VALID_DATABASES,
        VALID_FRAMEWORKS, VALID_LICENSES, VALID_RUNTIMES, VALID_SERVICES, VALID_TEST_FRAMEWORKS,
        VALID_VALIDATORS,
    },
    core::manifest::ProjectEntry,
    core::token::get_token,
    prompt::{
        prompt_comma_separated_list, prompt_with_validation, prompt_without_validation,
        ArrayCompleter,
    },
};

use super::{
    command,
    core::{
        database::match_database,
        gitignore::generate_gitignore,
        iam::generate_iam_keys,
        license::{generate_license, match_license},
        manifest::generate_manifest,
        pnpm_workspace::generate_pnpm_workspace,
        rendered_template::{create_forklaunch_dir, write_rendered_templates},
        symlinks::generate_symlinks,
        template::{generate_with_template, PathIO, TemplateManifestData},
    },
    service::ServiceManifestData,
    CliCommand,
};

config_struct!(
    #[derive(Debug, Serialize, Content, Clone)]
    pub(crate) struct ApplicationManifestData {
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
pub(super) struct ApplicationCommand;

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ApplicationCommand {
    fn command(&self) -> Command {
        // TODO: Add support for biome
        command("application", "Initialize a new full monorepo application")
            .alias("app")
            .arg(Arg::new("name").help("The name of the application"))
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use")
                    .value_parser(VALID_DATABASES),
            )
            .arg(
                Arg::new("validator")
                    .short('v')
                    .long("validator")
                    .help("The validator to use")
                    .value_parser(VALID_VALIDATORS),
            )
            .arg(
                Arg::new("http-framework")
                    .short('f')
                    .long("http-framework")
                    .help("The framework to use")
                    .value_parser(VALID_FRAMEWORKS),
            )
            .arg(
                Arg::new("runtime")
                    .short('r')
                    .long("runtime")
                    .help("The runtime to use")
                    .value_parser(VALID_RUNTIMES),
            )
            .arg(
                Arg::new("test-framework")
                    .short('t')
                    .long("test-framework")
                    .help("The test framework to use")
                    .value_parser(VALID_TEST_FRAMEWORKS),
            )
            .arg(
                Arg::new("services")
                    .short('s')
                    .long("services")
                    .help("Additional services to include")
                    .value_parser(VALID_SERVICES)
                    .num_args(0..)
                    .action(ArgAction::Append),
            )
            // .arg(
            //     Arg::new("libraries")
            //         .short('l')
            //         .long("libraries")
            //         .help("Additional libraries to include.]")
            //         .value_parser(VALID_LIBRARIES)
            //         .num_args(0..)
            //         .action(ArgAction::Append),
            // )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the application"),
            )
            .arg(
                Arg::new("author")
                    .short('A')
                    .long("author")
                    .help("The author of the application"),
            )
            .arg(
                Arg::new("license")
                    .short('L')
                    .long("license")
                    .help("The license of the application")
                    .value_parser(VALID_LICENSES),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        // TODO: Include basic token checks (expiration, permissions mapping) in this method, but retrieve token from parent command
        let _token = get_token()?;

        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "Enter application name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Application name cannot be empty. Please try again".to_string(),
        )?;

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

        let validator = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "validator",
            matches,
            "Enter validator type",
            Some(&VALID_VALIDATORS),
            |input| VALID_VALIDATORS.contains(&input),
            |_| "Invalid validator type. Please try again".to_string(),
        )?;

        let runtime = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "runtime",
            matches,
            "Enter runtime",
            Some(&VALID_RUNTIMES),
            |input| VALID_RUNTIMES.contains(&input),
            |_| "Invalid runtime. Please try again".to_string(),
        )?;

        let http_framework = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "http-framework",
            matches,
            "Enter HTTP framework",
            Some(&VALID_FRAMEWORKS),
            |input| {
                VALID_FRAMEWORKS.contains(&input) && !(runtime == "bun" && input == "hyper-express")
            },
            |input| {
                if runtime == "bun" && input == "hyper-express" {
                    "Hyper Express is not supported for bun".to_string()
                } else {
                    "Invalid HTTP framework. Please try again".to_string()
                }
            },
        )?;

        let test_framework = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "test-framework",
            matches,
            "Enter test framework",
            Some(&VALID_TEST_FRAMEWORKS),
            |input| VALID_TEST_FRAMEWORKS.contains(&input),
            |_| "Invalid test framework. Please try again".to_string(),
        )?;

        let services = prompt_comma_separated_list(
            &mut line_editor,
            "services",
            matches,
            &VALID_SERVICES,
            "services",
            false,
        )?;

        // let _libraries = prompt_comma_separated_list(
        //     &mut line_editor,
        //     "libraries",
        //     matches,
        //     &VALID_LIBRARIES,
        //     "libraries",
        //     true,
        // )?;

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "Enter project description (optional): ",
        )?;

        let author = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "author",
            matches,
            "Enter author name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Author name cannot be empty. Please try again".to_string(),
        )?;

        let license = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "license",
            matches,
            "Enter license",
            Some(&VALID_LICENSES),
            |input: &str| match_license(&input.to_lowercase()).is_ok(),
            |_| "Invalid license. Please try again".to_string(),
        )?;
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

        // Inline specific perms checks here. Make remote calls to receive templates for specific services if needed here (premium only).

        let mut additional_projects = vec![ProjectEntry {
            name: "core".to_string(),
            port: None,
            database: None,
        }];
        let port_number = 8000;
        additional_projects.extend(services.into_iter().enumerate().map(|(i, package)| {
            ProjectEntry {
                name: package.to_string(),
                port: Some((port_number + i).try_into().unwrap()),
                database: Some(database.to_string()),
            }
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

        let mut data = ApplicationManifestData {
            id: Uuid::new_v4().to_string(),
            cli_version: env!("CARGO_PKG_VERSION").to_string(),
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

        let mut rendered_templates = Vec::new();

        rendered_templates.extend(
            generate_manifest(&Path::new(&name).to_string_lossy().to_string(), &data)
                .with_context(|| "Failed to setup manifest file for application")?,
        );

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

        rendered_templates.extend(generate_with_template(
            Some(&name),
            &PathIO {
                input_path: Path::new("application").to_string_lossy().to_string(),
                output_path: "".to_string(),
            },
            &TemplateManifestData::Application(data.clone()),
            &ignore_files
                .iter()
                .map(|ignore_file| ignore_file.to_string())
                .collect::<Vec<String>>(),
        )?);

        for template_dir in template_dirs {
            rendered_templates.extend(generate_with_template(
                Some(&name),
                &template_dir,
                &TemplateManifestData::Service(ServiceManifestData {
                    id: data.id.clone(),
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
            )?);
        }

        rendered_templates.extend(
            generate_license(&Path::new(&name).to_string_lossy().to_string(), &data)
                .with_context(|| ERROR_FAILED_TO_CREATE_LICENSE)?,
        );

        rendered_templates.extend(
            generate_gitignore(&Path::new(&name).to_string_lossy().to_string())
                .with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?,
        );

        if runtime == "node" {
            rendered_templates.extend(
                generate_pnpm_workspace(&name, &additional_projects)
                    .with_context(|| ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE)?,
            );
        }

        if additional_projects_names.contains(&"iam".to_string()) {
            generate_iam_keys(&Path::new(&name)).with_context(|| ERROR_FAILED_TO_SETUP_IAM)?;
        }

        create_forklaunch_dir(&Path::new(&name).to_string_lossy().to_string())?;
        write_rendered_templates(&rendered_templates)
            .with_context(|| "Failed to write application files")?;

        additional_projects_dirs
            .into_iter()
            .try_for_each(|template_dir| {
                generate_symlinks(
                    Some(&name),
                    &Path::new(&name)
                        .join(&template_dir.output_path)
                        .to_string_lossy()
                        .to_string(),
                    &mut data,
                )
            })?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} initialized successfully!", name)?;
        stdout.reset()?;
        Ok(())
    }
}
