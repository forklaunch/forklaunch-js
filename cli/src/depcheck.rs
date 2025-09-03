use std::{
    collections::{HashMap, HashSet},
    fs::read_to_string,
    io::Write,
    path::{Path, PathBuf},
    env::current_dir,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::{Value, from_str, json};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST},
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        flexible_path::{get_base_app_path, find_manifest_path, create_project_config},
        command::command,
        manifest::application::ApplicationManifestData,
    },
    prompt::ArrayCompleter,
};

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

        // let base_path_input = prompt_base_path(
        //     &mut line_editor,
        //     &mut stdout,
        //     matches,
        //     &BasePathLocation::Anywhere,
        //     &BasePathType::Depcheck,
        // )?;
        // let base_path = Path::new(&base_path_input);
        let current_dir = std::env::current_dir().unwrap();
        let app_path = if let Some(temp_app_path) = get_base_app_path(&current_dir.to_string_lossy().to_string()) {
            temp_app_path
        } else {
            return Err(anyhow::anyhow!("Application directory not found in current directory, src/modules, or modules directories. Please check if your application is initialized and you are in the correct directory."));
        };
        
        let app_base_path = if let Some(relative_path) = matches.get_one::<String>("base_path") {
            // User provided a relative path, resolve it relative to current directory
            let resolved_path = current_dir.join(relative_path);
            println!("init:depcheck:03: App will be checked at: {:?}", resolved_path);
            resolved_path
        } else {
            // No path provided, assume current directory is where router should go
            println!("init:depcheck:03: No path provided, app will be checked in current directory: {:?}", current_dir);
            current_dir.clone()
        };
        let manifest_path_config = create_project_config();
        let manifest_path = find_manifest_path(&app_base_path, &manifest_path_config);
        
        let config_path = if let Some(manifest) = manifest_path {
            manifest
        } else {
            // No manifest found, this might be an error or we need to search more broadly
            anyhow::bail!("Could not find .forklaunch/manifest.toml. Make sure you're in a valid project directory or specify the correct base_path.");
        };
        let app_root_path: PathBuf = config_path
            .to_string_lossy()
            .strip_suffix(".forklaunch/manifest.toml")
            .ok_or_else(|| {
            anyhow::anyhow!("Expected manifest path to end with .forklaunch/manifest.toml, got: {:?}", config_path)
        })?
            .to_string()
            .into();

        // let config_path = Path::new(&base_path)
        //     .join(".forklaunch")
        //     .join("manifest.toml");

        let manifest_data: ApplicationManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        manifest_data.project_peer_topology.iter().try_for_each(
            |(group_name, group_projects)| -> Result<()> {
                let mut package_version_inventory: HashMap<String, Vec<ProjectDependencyVersion>> =
                    HashMap::new();
                let mut conflicting_packages: HashSet<String> = HashSet::new();

                group_projects
                    .iter()
                    .try_for_each(|project| -> Result<()> {
                        if let Some(package_json_contents) = &read_to_string(
                            Path::new(&app_path).join(project).join("package.json"),
                        )
                        .with_context(|| format!("Failed to read package.json for {}", project))
                        .ok()
                        {
                            if let Some(package_json) =
                                from_str::<Value>(package_json_contents).ok()
                            {
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
                                                conflicting_packages
                                                    .insert(package_name.to_string());
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
                            } else {
                                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                                writeln!(stdout, "Failed to parse package.json for {}. If the package has been removed, update .forklaunch/manifest.toml.", project)?;
                                stdout.reset()?;
                            }
                        } else {
                            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                            writeln!(stdout, "Failed to read package.json for {}. If the package has been removed, update .forklaunch/manifest.toml.", project)?;
                            stdout.reset()?;
                        }

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
                    stdout.reset()?;
                }

                Ok(())
            },
        )
    }
}
