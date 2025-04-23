use std::{
    fs::{exists, read_to_string, remove_file},
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, Command};
use dialoguer::{theme::ColorfulTheme, MultiSelect};
use rustyline::{history::DefaultHistory, Editor};
use serde_json::Value;
use termcolor::{ColorChoice, StandardStream};

use super::common::{description::change_description, name::change_name};
use crate::{
    constants::{
        Formatter, HttpFramework, License, Linter, Runtime, TestFramework, Validator,
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        ast::transformations::{
            transform_core_registration_http_framework_ts::transform_core_registration_http_framework_ts,
            transform_core_registration_validator_ts::transform_core_registration_validator_ts,
        },
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        license::{generate_license, match_license},
        manifest::{application::ApplicationManifestData, MutableManifestData},
        package_json::package_json_constants::{JEST_VERSION, TS_JEST_VERSION, VITEST_VERSION},
        removal_template::{self, RemovalTemplate},
        rendered_template::{write_rendered_templates, RenderedTemplate, TEMPLATES_DIR},
    },
    prompt::{prompt_field_from_selections_with_validation, ArrayCompleter},
    CliCommand,
};

const NODE_DOCKERFILE_INSTALL: &str = "RUN npm install -g pnpm
RUN apk update
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache git
RUN pnpm install";
const BUN_DOCKERFILE_INSTALL: &str = "RUN bun install";

#[derive(Debug)]
pub(super) struct ApplicationCommand;

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

fn change_formatter(
    base_path: &Path,
    formatter: &Formatter,
    manifest_data: &mut ApplicationManifestData,
) -> Result<(Vec<RenderedTemplate>, Vec<RemovalTemplate>)> {
    manifest_data.formatter = formatter.to_string();

    let mut rendered_templates = vec![];

    for file in formatter.metadata().exclusive_files.unwrap() {
        // add config files,
        let formatter_config_file_contents = TEMPLATES_DIR
            .get_file(Path::new("application").join(file.to_string()))
            .unwrap()
            .contents_utf8()
            .unwrap();

        rendered_templates.push(RenderedTemplate {
            path: base_path.join(file),
            content: formatter_config_file_contents.to_string(),
            context: None,
        });
    }

    let mut removal_templates = vec![];

    let existing_files = Formatter::all_other_files(formatter);

    for file in existing_files {
        let file_path = base_path.join(file);
        if exists(&file_path)? {
            let file_content = read_to_string(&file_path)?;
            let file_content_template = TEMPLATES_DIR
                .get_file(Path::new("application").join(file.to_string()))
                .unwrap()
                .contents_utf8()
                .unwrap();
            if file_content == file_content_template {
                removal_templates.push(RemovalTemplate { path: file_path });
            }
        }
    }

    Ok((rendered_templates, removal_templates))
}

fn change_linter(
    base_path: &Path,
    linter: &Linter,
    manifest_data: &mut ApplicationManifestData,
) -> Result<(Vec<RenderedTemplate>, Vec<RemovalTemplate>)> {
    manifest_data.linter = linter.to_string();

    let mut rendered_templates = vec![];

    for file in linter.metadata().exclusive_files.unwrap() {
        // add config files,
        let linter_config_file_contents = TEMPLATES_DIR
            .get_file(Path::new("application").join(file.to_string()))
            .unwrap()
            .contents_utf8()
            .unwrap();

        rendered_templates.push(RenderedTemplate {
            path: base_path.join(file),
            content: linter_config_file_contents.to_string(),
            context: None,
        });
    }

    let mut removal_templates = vec![];

    let existing_files = Linter::all_other_files(linter);

    for file in existing_files {
        let file_path = base_path.join(file);
        if exists(&file_path)? {
            let file_content = read_to_string(&file_path)?;
            let file_content_template = TEMPLATES_DIR
                .get_file(Path::new("application").join(file.to_string()))
                .unwrap()
                .contents_utf8()
                .unwrap();
            if file_content == file_content_template {
                removal_templates.push(RemovalTemplate { path: file_path });
            }
        }
    }

    Ok((rendered_templates, removal_templates))
}

fn change_validator(
    base_path: &Path,
    validator: &Validator,
    manifest_data: &mut ApplicationManifestData,
) -> Result<RenderedTemplate> {
    manifest_data.validator = validator.to_string();

    Ok(RenderedTemplate {
        path: base_path.join("core").join("registration.ts"),
        content: transform_core_registration_validator_ts(&validator.to_string(), base_path)?,
        context: None,
    })
}

fn change_http_framework(
    base_path: &Path,
    http_framework: &HttpFramework,
    manifest_data: &mut ApplicationManifestData,
) -> Result<RenderedTemplate> {
    manifest_data.http_framework = http_framework.to_string();

    Ok(RenderedTemplate {
        path: base_path.join("core").join("registration.ts"),
        content: transform_core_registration_http_framework_ts(
            &http_framework.to_string(),
            base_path,
        )?,
        context: None,
    })
}

fn get_replacement_mapping(replacements: (&str, &str)) -> impl FnOnce(String) -> String {
    let identity = |s: String| s;
    match replacements {
        ("node", "bun") => |s: String| {
            s.replace("pnpm -r", "bun --filter='*'")
                .replace("pnpm --parallel -r", "bun --filter='*'")
                .replace("pnpm", "bun")
        },
        ("bun", "node") => |s: String| {
            s.replace("bun --filter='*'", "pnpm -r")
                .replace("bun", "pnpm")
        },
        _ => identity,
    }
}

fn replace_dockerfile_contents(runtime: &str, dockerfile: &str) -> String {
    match runtime {
        "bun" => dockerfile
            .replace("FROM node:23-alpine", "FROM oven/bun:1")
            .replace(NODE_DOCKERFILE_INSTALL, BUN_DOCKERFILE_INSTALL)
            .replace("RUN pnpm build", "RUN bun run build"),
        "node" => dockerfile
            .replace("FROM oven/bun:1", "FROM node:23-alpine")
            .replace(BUN_DOCKERFILE_INSTALL, NODE_DOCKERFILE_INSTALL)
            .replace("RUN bun run build", "RUN pnpm build"),
        _ => unreachable!(),
    }
}

fn change_runtime(
    base_path: &Path,
    runtime: &Runtime,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut Value,
) -> Result<Vec<RenderedTemplate>> {
    let mut rendered_templates = vec![];

    let existing_workspaces: Vec<String> = match manifest_data.runtime.parse()? {
        Runtime::Bun => application_json_to_write
            .get("scripts")
            .as_slice()
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<String>>(),
        Runtime::Node => serde_yml::from_str::<Vec<String>>(&read_to_string(
            &base_path.join("pnpm-workspace.yaml"),
        )?)?,
    };

    manifest_data.runtime = runtime.to_string();

    let application_package_json_unbounded_scripts = application_json_to_write
        .get("scripts")
        .unwrap()
        .as_object()
        .unwrap();

    let mut new_application_package_json_unbounded_scripts = serde_json::Map::new();
    application_package_json_unbounded_scripts
        .iter()
        .for_each(|(key, script)| {
            let script_replacement_function =
                get_replacement_mapping((&manifest_data.runtime, &runtime.to_string()));
            new_application_package_json_unbounded_scripts[key] =
                script_replacement_function(script.to_string()).into();
        });

    application_json_to_write["scripts"] = new_application_package_json_unbounded_scripts.into();
    if runtime == &Runtime::Bun {
        application_json_to_write["workspaces"] = existing_workspaces.into();
    } else if runtime == &Runtime::Node {
        rendered_templates.push(RenderedTemplate {
            path: base_path.join("pnpm-workspace.yaml"),
            content: serde_yml::to_string(&existing_workspaces)?,
            context: None,
        });
    }

    let dockerfile_contents = replace_dockerfile_contents(
        &runtime.to_string(),
        &read_to_string(base_path.join("Dockerfile"))?,
    );

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("Dockerfile"),
        content: dockerfile_contents,
        context: None,
    });

    Ok(rendered_templates)
}

fn change_test_framework(
    base_path: &Path,
    test_framework: &TestFramework,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut Value,
) -> Result<(Option<RenderedTemplate>, Vec<RemovalTemplate>)> {
    manifest_data.test_framework = Some(test_framework.to_string());

    let mut removal_templates = vec![];
    application_json_to_write["devDependencies"] = application_json_to_write
        .get("devDependencies")
        .filter(|dep| {
            !(TestFramework::VARIANTS
                .iter()
                .any(|tf| dep.to_string().contains(tf)))
        })
        .unwrap()
        .to_owned();

    if manifest_data.runtime.parse::<Runtime>()? == Runtime::Bun {
        for file in TestFramework::ALL_FILES {
            let config_file = base_path.join(file);
            if exists(&config_file)? {
                removal_templates.push(RemovalTemplate { path: config_file });
            }
        }

        return Ok((None, removal_templates));
    }

    Ok((
        Some(match test_framework {
            TestFramework::Vitest => {
                application_json_to_write["devDependencies"]
                    .as_object_mut()
                    .unwrap()["vitest"] = Value::String(VITEST_VERSION.to_string());
                let vitest_config_file_contents = TEMPLATES_DIR
                    .get_file(Path::new("application").join("vitest.config.ts"))
                    .unwrap()
                    .contents_utf8()
                    .unwrap();
                RenderedTemplate {
                    path: base_path.join("vitest.config.ts"),
                    content: vitest_config_file_contents.to_string(),
                    context: None,
                }
            }
            TestFramework::Jest => {
                let dependencies = application_json_to_write["devDependencies"]
                    .as_object_mut()
                    .unwrap();

                dependencies["jest"] = Value::String(JEST_VERSION.to_string());
                dependencies["ts-jest"] = Value::String(TS_JEST_VERSION.to_string());
                dependencies["@types/jest"] = Value::String(TS_JEST_VERSION.to_string());

                let jest_config_file_contents = TEMPLATES_DIR
                    .get_file(Path::new("application").join("jest.config.ts"))
                    .unwrap()
                    .contents_utf8()
                    .unwrap();

                RenderedTemplate {
                    path: base_path.join("jest.config.ts"),
                    content: jest_config_file_contents.to_string(),
                    context: None,
                }
            }
        }),
        removal_templates,
    ))
}

fn change_author(
    author: &str,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut Value,
) {
    manifest_data.author = author.to_string();
    application_json_to_write["author"] = Value::String(author.to_string());
}

fn change_license(
    base_path: &Path,
    license: &License,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut Value,
) -> Result<(Option<RenderedTemplate>, Option<RemovalTemplate>)> {
    manifest_data.license = license.to_string();
    let license_path = base_path.join("LICENSE");

    let mut removal_template = None;
    if exists(&license_path)? {
        removal_template = Some(RemovalTemplate { path: license_path });
    }

    application_json_to_write["license"] = Value::String(license.to_string());

    Ok((
        generate_license(base_path.to_str().unwrap(), &manifest_data)?,
        removal_template,
    ))
}

impl CliCommand for ApplicationCommand {
    fn command(&self) -> Command {
        command("application", "Change a forklaunch Application")
            .alias("app")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application root path"),
            )
            .arg(
                Arg::new("name")
                    .short('N')
                    .help("The name of the application"),
            )
            .arg(
                Arg::new("validator")
                    .short('v')
                    .long("validator")
                    .help("The validator to use")
                    .value_parser(Validator::VARIANTS),
            )
            .arg(
                Arg::new("formatter")
                    .short('f')
                    .long("formatter")
                    .help("The formatter to use")
                    .value_parser(Formatter::VARIANTS),
            )
            .arg(
                Arg::new("linter")
                    .short('l')
                    .long("linter")
                    .help("The linter to use")
                    .value_parser(Linter::VARIANTS),
            )
            .arg(
                Arg::new("http-framework")
                    .short('F')
                    .long("http-framework")
                    .help("The http framework to use")
                    .value_parser(HttpFramework::VARIANTS),
            )
            .arg(
                Arg::new("runtime")
                    .short('r')
                    .long("runtime")
                    .help("The runtime to use")
                    .value_parser(Runtime::VARIANTS),
            )
            .arg(
                Arg::new("test-framework")
                    .short('t')
                    .long("test-framework")
                    .help("The test framework to use")
                    .value_parser(TestFramework::VARIANTS),
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
                    .value_parser(License::VARIANTS),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command"),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Application,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data: ApplicationManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let name = matches.get_one::<String>("name");
        let formatter = matches.get_one::<String>("formatter");
        let linter = matches.get_one::<String>("linter");
        let validator = matches.get_one::<String>("validator");
        let runtime = matches.get_one::<String>("runtime");
        let http_framework = matches.get_one::<String>("http-framework");
        let test_framework = matches.get_one::<String>("test-framework");
        let description = matches.get_one::<String>("description");
        let author = matches.get_one::<String>("author");
        let license = matches.get_one::<String>("license");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if !matches.args_present() {
            let options = vec![
                "name",
                "formatter",
                "linter",
                "http-framework",
                "runtime",
                "validator",
                "test-framework",
                "description",
                "author",
                "license",
            ];

            let selections = MultiSelect::with_theme(&ColorfulTheme::default())
                .with_prompt("What would you like to change?")
                .items(&options)
                .interact()?;

            if selections.is_empty() {
                writeln!(stdout, "No changes selected")?;
                return Ok(());
            }

            selections.iter().map(|i| options[*i]).collect()
        } else {
            vec![]
        };

        let name = prompt_field_from_selections_with_validation(
            "name",
            name,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter application name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Application name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let runtime = prompt_field_from_selections_with_validation(
            "runtime",
            runtime,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter runtime: ",
            Some(&Runtime::VARIANTS),
            |input| Runtime::VARIANTS.contains(&input),
            |_| "Invalid runtime. Please try again".to_string(),
        )?;

        let http_framework = prompt_field_from_selections_with_validation(
            "http-framework",
            http_framework,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter HTTP framework: ",
            Some(&HttpFramework::VARIANTS),
            |input| {
                HttpFramework::VARIANTS.contains(&input)
                    && !(runtime == Some("bun".to_string()) && input == "hyper-express")
            },
            |input| {
                if runtime == Some("bun".to_string()) && input == "hyper-express" {
                    "Hyper Express is not supported for bun".to_string()
                } else {
                    "Invalid HTTP framework. Please try again".to_string()
                }
            },
        )?;

        let formatter = prompt_field_from_selections_with_validation(
            "formatter",
            formatter,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter formatter: ",
            Some(&Formatter::VARIANTS),
            |input| Formatter::VARIANTS.contains(&input),
            |_| "Invalid formatter. Please try again".to_string(),
        )?;

        let linter = prompt_field_from_selections_with_validation(
            "linter",
            linter,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter linter: ",
            Some(&Linter::VARIANTS),
            |input| Linter::VARIANTS.contains(&input),
            |_| "Invalid linter. Please try again".to_string(),
        )?;

        let validator = prompt_field_from_selections_with_validation(
            "validator",
            validator,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter validator: ",
            Some(&Validator::VARIANTS),
            |input| Validator::VARIANTS.contains(&input),
            |_| "Invalid validator. Please try again".to_string(),
        )?;

        let test_framework = prompt_field_from_selections_with_validation(
            "test-framework",
            test_framework,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter test framework: ",
            Some(&TestFramework::VARIANTS),
            |input| TestFramework::VARIANTS.contains(&input),
            |_| "Invalid test framework. Please try again".to_string(),
        )?;

        let description = prompt_field_from_selections_with_validation(
            "description",
            description,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter project description (optional): ",
            None,
            |_input: &str| true,
            |_| "Invalid description. Please try again".to_string(),
        )?;

        let author = prompt_field_from_selections_with_validation(
            "author",
            author,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter author name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Author name cannot be empty. Please try again".to_string(),
        )?;

        let license = prompt_field_from_selections_with_validation(
            "license",
            license,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter license: ",
            Some(&License::VARIANTS),
            |input: &str| match_license(input.parse().unwrap()).is_ok(),
            |_| "Invalid license. Please try again".to_string(),
        )?;

        let mut rendered_templates = vec![];
        let mut removal_templates = vec![];

        let application_package_json_path = base_path.join("package.json");
        let application_package_json_data = read_to_string(&application_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;

        let mut application_json_to_write =
            serde_json::from_str::<Value>(&application_package_json_data)?;

        if let Some(name) = name {
            rendered_templates.push(change_name(
                &base_path,
                &name,
                &mut MutableManifestData::Application(&mut manifest_data),
            )?);
        }

        if let Some(formatter) = formatter {
            let (formatter_rendered_templates, formatter_removal_templates) =
                change_formatter(&base_path, &formatter.parse()?, &mut manifest_data)?;
            rendered_templates.extend(formatter_rendered_templates);
            removal_templates.extend(formatter_removal_templates);
        }

        if let Some(linter) = linter {
            let (linter_rendered_templates, linter_removal_templates) =
                change_linter(&base_path, &linter.parse()?, &mut manifest_data)?;
            rendered_templates.extend(linter_rendered_templates);
            removal_templates.extend(linter_removal_templates);
        }

        if let Some(validator) = validator {
            rendered_templates.push(change_validator(
                &base_path,
                &validator.parse()?,
                &mut manifest_data,
            )?);
        }

        if let Some(http_framework) = http_framework {
            rendered_templates.push(change_http_framework(
                &base_path,
                &http_framework.parse()?,
                &mut manifest_data,
            )?);
        }

        if let Some(runtime) = runtime {
            rendered_templates.extend(change_runtime(
                &base_path,
                &runtime.parse()?,
                &mut manifest_data,
                &mut application_json_to_write,
            )?);
        }

        if let Some(test_framework) = test_framework {
            let (test_framework_template_option, test_framework_removal_templates) =
                change_test_framework(
                    &base_path,
                    &test_framework.parse()?,
                    &mut manifest_data,
                    &mut application_json_to_write,
                )?;
            if let Some(test_framework_template) = test_framework_template_option {
                rendered_templates.push(test_framework_template);
            }
            removal_templates.extend(test_framework_removal_templates);
        }

        if let Some(description) = description {
            change_description(&description, &mut application_json_to_write);
        }

        if let Some(author) = author {
            change_author(&author, &mut manifest_data, &mut application_json_to_write);
        }

        if let Some(license) = license {
            let (license, removal_template) = change_license(
                &base_path,
                &license.parse()?,
                &mut manifest_data,
                &mut application_json_to_write,
            )?;

            if let Some(license) = license {
                rendered_templates.push(license);
            }
            if let Some(removal_template) = removal_template {
                removal_templates.push(removal_template);
            }
        }

        rendered_templates.push(RenderedTemplate {
            path: config_path.to_path_buf(),
            content: toml::to_string_pretty(&manifest_data)?,
            context: None,
        });

        rendered_templates.push(RenderedTemplate {
            path: base_path.join("package.json"),
            content: serde_json::to_string_pretty(&application_json_to_write)?,
            context: None,
        });

        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;

        Ok(())
    }
}
