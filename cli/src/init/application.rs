use std::{collections::HashMap, io::Write, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use ramhorns::Content;
use rustyline::{
    completion::{Completer, Pair},
    history::DefaultHistory,
    Editor,
};
use rustyline_derive::{Helper, Highlighter, Hinter, Validator};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use uuid::Uuid;

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_CREATE_GITIGNORE, ERROR_FAILED_TO_CREATE_LICENSE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE, ERROR_FAILED_TO_SETUP_IAM, LATEST_CLI_VERSION,
        VALID_DATABASES, VALID_FRAMEWORKS, VALID_LIBRARIES, VALID_LICENSES, VALID_RUNTIMES,
        VALID_SERVICES, VALID_TEST_FRAMEWORKS, VALID_VALIDATORS,
    },
    utils::get_token,
};

use super::{
    core::{
        config::ProjectEntry,
        database::match_database,
        gitignore::generate_gitignore,
        iam::generate_iam_keys,
        license::{generate_license, match_license},
        manifest::generate_manifest,
        pnpm_workspace::generate_pnpm_workspace,
        rendered_template::{create_forklaunch_dir, write_rendered_templates},
        symlinks::generate_symlinks,
        template::{generate_with_template, PathIO, TemplateConfigData},
    },
    forklaunch_command,
    service::ServiceConfigData,
    CliCommand,
};

config_struct!(
    #[derive(Debug, Serialize, Content, Clone)]
    pub(crate) struct ApplicationConfigData {
        id: String,

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

// move this to a separate file
#[derive(Helper, Hinter, Validator, Highlighter)]
struct ArrayCompleter {
    options: Vec<String>,
}

impl Completer for ArrayCompleter {
    type Candidate = Pair;

    fn complete(
        &self,
        line: &str,
        pos: usize,
        _ctx: &rustyline::Context<'_>,
    ) -> rustyline::Result<(usize, Vec<Pair>)> {
        let current_line = line.split(',').last().unwrap_or(line).trim();
        let matches: Vec<Pair> = self
            .options
            .iter()
            .filter(|option| option.starts_with(current_line))
            .map(|option| Pair {
                display: option.clone(),
                replacement: option.clone(),
            })
            .collect();
        Ok((pos - current_line.len(), matches))
    }
}

// end move

impl CliCommand for ApplicationCommand {
    fn command(&self) -> Command {
        // TODO: Add support for biome
        forklaunch_command("application", "Initialize a new full monorepo application")
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
            .arg(
                Arg::new("libraries")
                    .short('l')
                    .long("libraries")
                    .help("Additional libraries to include.]")
                    .value_parser(VALID_LIBRARIES)
                    .num_args(0..)
                    .action(ArgAction::Append),
            )
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
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let name = loop {
            let input = match matches.get_one::<String>("name") {
                Some(n) => n.to_string(),
                None => {
                    let prompt = "Enter application name: ";
                    line_editor.readline(prompt)?.trim().to_string()
                }
            };
            if !input.is_empty() {
                break input;
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(
                &mut stdout,
                "Application name cannot be empty. Please try again"
            )?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let database = loop {
            let input = match matches.get_one::<String>("database") {
                Some(db) => db.to_string(),
                None => {
                    let completer = ArrayCompleter {
                        options: VALID_DATABASES.iter().map(|&s| s.to_string()).collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt = format!("Enter database type [{}]: ", VALID_DATABASES.join(", "));
                    line_editor.readline(prompt.as_str())?.trim().to_string()
                }
            };
            if VALID_DATABASES.contains(&input.as_str()) {
                break input;
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(&mut stdout, "Invalid database type. Please try again")?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let validator = loop {
            let input = match matches.get_one::<String>("validator") {
                Some(v) => v.to_string(),
                None => {
                    let completer = ArrayCompleter {
                        options: VALID_VALIDATORS.iter().map(|&s| s.to_string()).collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt =
                        format!("Enter validator type [{}]: ", VALID_VALIDATORS.join(", "));
                    line_editor.readline(prompt.as_str())?.trim().to_string()
                }
            };
            if VALID_VALIDATORS.contains(&input.as_str()) {
                break input;
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(&mut stdout, "Invalid validator type. Please try again")?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let runtime = loop {
            let input = match matches.get_one::<String>("runtime") {
                Some(r) => r.to_string(),
                None => {
                    let completer = ArrayCompleter {
                        options: VALID_RUNTIMES.iter().map(|&s| s.to_string()).collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt = format!("Enter runtime [{}]: ", VALID_RUNTIMES.join(", "));
                    line_editor.readline(prompt.as_str())?.trim().to_string()
                }
            };
            if VALID_RUNTIMES.contains(&input.as_str()) {
                break input;
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(&mut stdout, "Invalid runtime. Please try again")?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let http_framework = loop {
            let input = match matches.get_one::<String>("http-framework") {
                Some(f) => f.to_string(),
                None => {
                    let completer = ArrayCompleter {
                        options: VALID_FRAMEWORKS.iter().map(|&s| s.to_string()).collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt =
                        format!("Enter HTTP framework [{}]: ", VALID_FRAMEWORKS.join(", "));
                    line_editor.readline(prompt.as_str())?.trim().to_string()
                }
            };

            if VALID_FRAMEWORKS.contains(&input.as_str()) {
                if runtime == "bun" && input == "hyper-express" {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                    write!(&mut stdout, "Hyper Express is not supported for bun")?;
                    stdout.reset()?;
                    writeln!(&mut stdout)?;
                    continue;
                } else {
                    break input;
                }
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(&mut stdout, "Invalid HTTP framework. Please try again")?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let test_framework = loop {
            let input = match matches.get_one::<String>("test-framework") {
                Some(t) => t.to_string(),
                None => {
                    let completer = ArrayCompleter {
                        options: VALID_TEST_FRAMEWORKS
                            .iter()
                            .map(|&s| s.to_string())
                            .collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt = format!(
                        "Enter test framework [{}]: ",
                        VALID_TEST_FRAMEWORKS.join(", ")
                    );
                    line_editor.readline(prompt.as_str())?.trim().to_string()
                }
            };
            if VALID_TEST_FRAMEWORKS.contains(&input.as_str()) {
                break input;
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(&mut stdout, "Invalid test framework. Please try again")?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let services = match matches.get_many::<String>("services") {
            Some(p) => p.cloned().collect::<Vec<String>>(),
            None => {
                let completer = ArrayCompleter {
                    options: VALID_SERVICES.iter().map(|&s| s.to_string()).collect(),
                };
                line_editor.set_helper(Some(completer));
                let prompt = format!(
                    "Enter services (comma-separated) [{}]: ",
                    VALID_SERVICES.join(", ")
                );
                let input = line_editor.readline(prompt.as_str())?;
                if input.trim().is_empty() {
                    vec![]
                } else {
                    input
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| VALID_SERVICES.contains(&s.as_str()))
                        .collect::<Vec<String>>()
                        .into_iter()
                        .collect::<std::collections::HashSet<_>>()
                        .into_iter()
                        .collect()
                }
            }
        };

        // TODO: Add support for libraries
        let _libraries = match matches.get_many::<String>("libraries") {
            Some(l) => l.cloned().collect::<Vec<String>>(),
            None => {
                let completer = ArrayCompleter {
                    options: VALID_LIBRARIES.iter().map(|&s| s.to_string()).collect(),
                };
                line_editor.set_helper(Some(completer));
                let prompt = format!(
                    "Enter libraries (comma-separated) [{}] (optional): ",
                    VALID_LIBRARIES.join(", ")
                );
                let input = line_editor.readline(prompt.as_str())?;
                if input.trim().is_empty() {
                    vec![]
                } else {
                    input
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| VALID_LIBRARIES.contains(&s.as_str()))
                        .collect::<Vec<String>>()
                        .into_iter()
                        .collect::<std::collections::HashSet<_>>()
                        .into_iter()
                        .collect()
                }
            }
        };

        let description = match matches.get_one::<String>("description") {
            Some(d) => d.to_string(),
            None => {
                let prompt = "Enter project description (optional): ";
                line_editor.readline(prompt)?.trim().to_string()
            }
        };

        let author = loop {
            let input = match matches.get_one::<String>("author") {
                Some(a) => a.to_string(),
                None => {
                    let prompt = "Enter author name: ";
                    line_editor.readline(prompt)?.trim().to_string()
                }
            };
            if !input.is_empty() {
                break input;
            }
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            write!(&mut stdout, "Author name cannot be empty. Please try again")?;
            stdout.reset()?;
            writeln!(&mut stdout)?;
        };

        let license = loop {
            let input = match matches.get_one::<String>("license") {
                Some(l) => l.to_string(),
                None => {
                    let completer = ArrayCompleter {
                        options: VALID_LICENSES.iter().map(|&s| s.to_string()).collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt = format!("Enter license [{}]: ", VALID_LICENSES.join(", "));
                    line_editor.readline(prompt.as_str())?.trim().to_lowercase()
                }
            };
            match match_license(&input) {
                Ok(l) => break l,
                Err(_) => {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                    write!(&mut stdout, "Invalid license. Please try again")?;
                    stdout.reset()?;
                    writeln!(&mut stdout)?;
                }
            }
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

        // TODO: Include basic token checks (expiration, permissions mapping) in this method, but retrieve token from parent command
        let _token = get_token()?;

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

        let mut data = ApplicationConfigData {
            id: Uuid::new_v4().to_string(),
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
            &TemplateConfigData::Application(data.clone()),
            &ignore_files
                .iter()
                .map(|ignore_file| ignore_file.to_string())
                .collect::<Vec<String>>(),
        )?);

        for template_dir in template_dirs {
            rendered_templates.extend(generate_with_template(
                Some(&name),
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

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(&mut stdout, "{} initialized successfully!", name)?;
        stdout.reset()?;
        Ok(())
    }
}
