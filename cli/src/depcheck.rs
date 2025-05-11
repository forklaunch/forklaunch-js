use std::{
    collections::{HashMap, HashSet},
    fs::read_to_string,
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use serde::{Deserialize, Serialize};
use serde_json::{Value, from_str, json};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST},
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        manifest::application::ApplicationManifestData,
    },
    prompt::ArrayCompleter,
};

#[derive(Default, Serialize, Deserialize)]
struct PackageJsonDependencies {
    #[serde(default)]
    dependencies: Value,
    #[serde(default)]
    dev_dependencies: Value,
}

struct ProjectDependencyVersion {
    project_name: String,
    version: String,
}

pub(crate) struct DepcheckCommand;

impl DepcheckCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for DepcheckCommand {
    fn command(&self) -> Command {
        command(
            "depcheck",
            "Checks that dependencies aligned across projects. More info: https://forklaunch.com/docs/depcheck",
        )
        .alias("deps")
        .alias("dependencies")
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path to initialize the service in"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Anywhere,
            &BasePathType::Depcheck,
        )?;

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let config_data: ApplicationManifestData = toml::from_str(
            &read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        config_data.project_peer_topology.iter().try_for_each(
            |(group_name, group_projects)| -> Result<()> {
                let mut package_version_inventory: HashMap<String, Vec<ProjectDependencyVersion>> =
                    HashMap::new();
                let mut conflicting_packages: HashSet<String> = HashSet::new();

                group_projects
                    .iter()
                    .try_for_each(|project| -> Result<()> {
                        let package_json: Value = from_str(
                            &read_to_string(
                                Path::new(&base_path).join(project).join("package.json"),
                            )
                            .with_context(|| {
                                format!("Failed to read package.json for {}", project)
                            })?,
                        )
                        .with_context(|| format!("Failed to parse package.json for {}", project))?;

                        let empty_dependencies = json!({});
                        let dependencies = package_json
                            .get("dependencies")
                            .unwrap_or(&empty_dependencies);
                        let empty_dev_dependencies = json!({});
                        let dev_dependencies = package_json
                            .get("devDependencies")
                            .unwrap_or(&empty_dev_dependencies);

                        dependencies
                            .as_object()
                            .unwrap()
                            .iter()
                            .chain(dev_dependencies.as_object().unwrap().iter())
                            .for_each(|(package_name, version)| {
                                if let Some(existing_version) =
                                    package_version_inventory.get(package_name)
                                {
                                    if existing_version[0].version != version.to_string() {
                                        conflicting_packages.insert(package_name.to_string());
                                    }
                                }
                                if let Some(dependency_versions) =
                                    package_version_inventory.get_mut(package_name)
                                {
                                    dependency_versions.push(ProjectDependencyVersion {
                                        project_name: project.to_string(),
                                        version: version.to_string(),
                                    });
                                } else {
                                    package_version_inventory.insert(
                                        package_name.to_string(),
                                        vec![ProjectDependencyVersion {
                                            project_name: project.to_string(),
                                            version: version.to_string(),
                                        }],
                                    );
                                }
                            });

                        Ok(())
                    })?;

                if !conflicting_packages.is_empty() {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                    writeln!(
                        stdout,
                        "Conflicting packages in group {}:\n{}",
                        group_name,
                        conflicting_packages
                            .iter()
                            .map(|package_name| {
                                let project_dependency_versions =
                                    package_version_inventory.get(package_name).unwrap();

                                let mut serialized_conflict =
                                    vec![format!("\n- {}:\n", package_name)];

                                serialized_conflict.extend(project_dependency_versions.iter().map(
                                    |project_dependency_version| {
                                        format!(
                                            "  {}: {}",
                                            project_dependency_version.project_name,
                                            project_dependency_version.version
                                        )
                                    },
                                ));

                                serialized_conflict.join("\n") + "\n"
                            })
                            .collect::<Vec<String>>()
                            .join("\n")
                    )?;
                } else {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "No conflicting packages in group {}!", group_name)?;
                }

                Ok(())
            },
        )
    }
}
