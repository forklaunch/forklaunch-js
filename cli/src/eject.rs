use std::{
    borrow::Cow,
    fs::{read_dir, read_to_string},
    io::Write,
    path::Path,
};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use fs_extra::dir::{copy, CopyOptions};
use rustyline::{history::DefaultHistory, Editor};
use serde_json::{from_str, to_string_pretty, Map, Value};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use walkdir::{DirEntry, WalkDir};

use crate::{
    constants::{
        ERROR_FAILED_TO_EJECT_DIRECTORY_NOT_EJECTABLE, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_PARSE_PACKAGE_JSON, ERROR_FAILED_TO_READ_MANIFEST,
    },
    core::{
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        relative_path::get_relative_path,
    },
    init::{
        application::ApplicationManifestData,
        core::rendered_template::{write_rendered_templates, RenderedTemplate},
    },
    prompt::{prompt_for_confirmation, ArrayCompleter},
    CliCommand,
};

// TODO: add injected token into struct
#[derive(Debug)]
pub(crate) struct EjectCommand {}

impl EjectCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

fn eject_dependencies(
    package_json: &mut Value,
    base_path: &Path,
    stdout: &mut StandardStream,
    dryrun: bool,
) -> Result<(Vec<String>, Map<String, Value>)> {
    let dependencies = package_json
        .get("dependencies")
        .and_then(|deps| deps.as_object())
        .unwrap();

    let mut dependencies_to_eject = Vec::new();
    for dependency in dependencies {
        let dependency_name = dependency.0;
        if dependency_name.starts_with("@forklaunch/implementation-")
            || dependency_name.starts_with("@forklaunch/interfaces-")
        {
            dependencies_to_eject.push(dependency_name.to_string());
        }
    }

    let filtered_dependencies: Map<String, Value> = dependencies
        .iter()
        .filter(|(name, _)| !dependencies_to_eject.contains(&name.to_string()))
        .map(|(name, value)| (name.clone(), value.clone()))
        .collect();

    let node_modules_path = if base_path.join("node_modules").exists() {
        base_path.join("node_modules")
    } else {
        base_path.parent().unwrap().join("node_modules")
    };

    for ejectable_dependency in &dependencies_to_eject {
        let dependency_path = node_modules_path
            .join(&ejectable_dependency)
            .join("lib")
            .join("eject");

        if !dependency_path.exists() {
            bail!(
                "{}",
                ERROR_FAILED_TO_EJECT_DIRECTORY_NOT_EJECTABLE.to_string()
            );
        }
        let mut options = CopyOptions::new();
        options.overwrite = false;
        options.copy_inside = true;

        for entry in read_dir(&dependency_path)? {
            let entry = entry?;
            let source_path = entry.path();
            let target_path = if source_path.is_dir() && base_path.join(entry.file_name()).is_dir()
            {
                base_path.to_path_buf()
            } else {
                base_path.join(entry.file_name())
            };

            if dryrun {
                writeln!(
                    stdout,
                    "Would copy {} to {}",
                    source_path.display(),
                    target_path.display()
                )?;
            } else {
                copy(&source_path, &target_path, &options).with_context(|| {
                    format!("Failed to copy files from {}", source_path.display())
                })?;
            }
        }
    }

    Ok((dependencies_to_eject, filtered_dependencies))
}

fn domain_prefix(package_name: &str) -> &str {
    match package_name {
        "/schemas" => "/domain/schemas",
        "/interfaces" => "/domain/interfaces",
        "/types" => "/domain/types",
        _ => package_name,
    }
}

fn perform_string_replacements(
    app_files: &Vec<DirEntry>,
    base_path: &Path,
    config_data: &ApplicationManifestData,
    dependencies_to_eject: &Vec<String>,
    templates_to_render: &mut Vec<RenderedTemplate>,
) -> Result<()> {
    for file in app_files {
        if file.file_name() != "package.json" {
            let file_path = &file.path();
            let relative_path_difference = get_relative_path(file_path, base_path);

            let content = read_to_string(file_path)
                .with_context(|| format!("Failed to read file {}", file_path.display()))?;

            let mut new_content = content.clone();

            new_content = new_content.replace(
                "@{{app_name}}/core",
                format!("@{}/core", config_data.app_name).as_str(),
            );

            let relative_path_difference_prefix = match relative_path_difference.to_string_lossy() {
                Cow::Borrowed("") => Cow::Borrowed("."),
                Cow::Borrowed(s) => Cow::Borrowed(s),
                Cow::Owned(s) => Cow::Owned(s),
            };

            for dependency in dependencies_to_eject {
                let module_types = ["/schemas", "/interfaces", "/types", "/services"];
                for module_type in module_types {
                    new_content = new_content.replace(
                        format!("{}{}", dependency, module_type).as_str(),
                        format!(
                            "{}{}",
                            relative_path_difference_prefix,
                            domain_prefix(module_type)
                        )
                        .as_str(),
                    );
                }
            }

            new_content = new_content
                .lines()
                .filter(|line| {
                    if line.contains("validator: SchemaValidator()") {
                        false
                    } else {
                        true
                    }
                })
                .collect::<Vec<_>>()
                .join("\n");

            templates_to_render.push(RenderedTemplate {
                path: file_path.to_path_buf(),
                content: new_content,
                context: Some(format!("Failed to write file {}", file_path.display())),
            });
        }
    }

    Ok(())
}

impl CliCommand for EjectCommand {
    fn command(&self) -> Command {
        command("eject", "Eject a forklaunch project")
            .alias("ej")
            .arg(Arg::new("base_path").short('b'))
            .arg(
                Arg::new("continue")
                    .short('c')
                    .long("continue")
                    .help("Continue the eject operation")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the application")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let continue_eject_override = matches.get_flag("continue");
        let dryrun = matches.get_flag("dryrun");

        if !continue_eject_override && !dryrun {
            let continue_eject = prompt_for_confirmation(
                &mut line_editor,
                "This operation is irreversible. Do you want to continue? (y/N) ",
            )?;

            if !continue_eject {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                writeln!(stdout, "Ejection cancelled")?;
                stdout.reset()?;
                return Ok(());
            }
        }

        let base_path = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Eject,
        )?;

        let base_path = Path::new(&base_path);

        let config_path = base_path
            .parent()
            .unwrap()
            .join(".forklaunch")
            .join("manifest.toml");

        let config_data: ApplicationManifestData = toml::from_str(
            &read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let package_path = base_path.join("package.json");

        let package_data =
            read_to_string(&package_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?;

        let mut package_json: Value =
            from_str(&package_data).with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

        let (dependencies_to_eject, filtered_dependencies) =
            eject_dependencies(&mut package_json, &base_path, &mut stdout, dryrun)?;

        let app_files = WalkDir::new(base_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let path = e.path();
                path.extension()
                    .map_or(false, |ext| ext == "ts" || ext == "tsx")
            })
            .collect::<Vec<_>>();

        package_json["dependencies"] = filtered_dependencies.into();
        let mut templates_to_render = vec![RenderedTemplate {
            path: package_path,
            content: to_string_pretty(&package_json)?,
            context: None,
        }];

        if !dryrun {
            perform_string_replacements(
                &app_files,
                &base_path,
                &config_data,
                &dependencies_to_eject,
                &mut templates_to_render,
            )?;
        }

        write_rendered_templates(&templates_to_render, dryrun, &mut stdout)?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "Ejected successfully!")?;
            stdout.reset()?;
        }

        Ok(())
    }
}
