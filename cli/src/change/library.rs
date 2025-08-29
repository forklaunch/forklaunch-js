use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use dialoguer::{MultiSelect, theme::ColorfulTheme};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use super::core::{
    change_description::change_description as change_description_core,
    change_name::change_name as change_name_core,
};
use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        format::format_code,
        manifest::{
            InitializableManifestConfig, InitializableManifestConfigMetadata, MutableManifestData,
            ProjectInitializationMetadata, library::LibraryManifestData,
        },
        move_template::{MoveTemplate, move_template_files},
        name::validate_name,
        package_json::{
            application_package_json::ApplicationPackageJson,
            project_package_json::ProjectPackageJson,
        },
        removal_template::{RemovalTemplate, remove_template_files},
        rendered_template::{RenderedTemplate, RenderedTemplatesCache, write_rendered_templates},
    },
    prompt::{ArrayCompleter, prompt_field_from_selections_with_validation},
};

#[derive(Debug)]
pub(super) struct LibraryCommand;

impl LibraryCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

fn change_name(
    base_path: &Path,
    name: &str,
    confirm: bool,
    manifest_data: &mut LibraryManifestData,
    application_package_json: &mut ApplicationPackageJson,
    project_package_json: &mut ProjectPackageJson,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    removal_templates: &mut Vec<RemovalTemplate>,
    stdout: &mut StandardStream,
) -> Result<MoveTemplate> {
    change_name_core(
        base_path,
        name,
        confirm,
        MutableManifestData::Library(manifest_data),
        application_package_json,
        project_package_json,
        None,
        rendered_templates_cache,
        removal_templates,
        stdout,
    )
}

fn change_description(
    description: &str,
    manifest_data: &mut LibraryManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    change_description_core(
        description,
        MutableManifestData::Library(manifest_data),
        project_package_json,
    )
}

impl CliCommand for LibraryCommand {
    fn command(&self) -> Command {
        command("library", "Change a forklaunch library")
            .alias("lib")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The library path"),
            )
            .arg(Arg::new("name").short('N').help("The name of the library"))
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the library"),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("confirm")
                    .short('c')
                    .long("confirm")
                    .help("Flag to confirm any prompts")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        // let base_path_input = prompt_base_path(
        //     &mut line_editor,
        //     &mut stdout,
        //     matches,
        //     &BasePathLocation::Library,
        //     &BasePathType::Change,
        // )?;
        // let base_path = Path::new(&base_path_input);

        let current_dir = std::env::current_dir().unwrap();
        // Determine where the router should be created
        let library_base_path = if let Some(relative_path) = matches.get_one::<String>("base_path") {
            // User provided a relative path, resolve it relative to current directory
            let resolved_path = current_dir.join(relative_path);
            println!("init:service:03: Library will be deleted at: {:?}", resolved_path);
            resolved_path
        } else {
            current_dir.clone()
        };

        // Find the manifest using flexible_path
        let root_path_config = create_generic_config();
        let manifest_path = find_manifest_path(&service_base_path, &root_path_config);
        
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
        
        println!("init:service:06: config_path: {:?}", config_path);
        println!("init:service:07: base_path: {:?}", library_base_path);
        println!("init:service:08: app_root_path: {:?}", app_root_path);

        let mut manifest_data: LibraryManifestData = toml::from_str::<LibraryManifestData>(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        .initialize(InitializableManifestConfigMetadata::Project(
            ProjectInitializationMetadata {
                project_name: library_base_path.file_name().unwrap().to_string_lossy().to_string(),
            },
        ));

        let name = matches.get_one::<String>("name");
        let description = matches.get_one::<String>("description");
        let dryrun = matches.get_flag("dryrun");
        let confirm = matches.get_flag("confirm");

        let selected_options = if matches.ids().all(|id| id == "dryrun" || id == "confirm") {
            let options = vec!["name", "description"];

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
            "library name",
            None,
            |input: &str| validate_name(input) && !manifest_data.app_name.contains(input),
            |_| {
                "Library name cannot be a substring of the application name, empty or include numbers or spaces. Please try again"
                    .to_string()
            },
        )?;

        let description = prompt_field_from_selections_with_validation(
            "description",
            description,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "project description (optional)",
            None,
            |_input: &str| true,
            |_| "Invalid description. Please try again".to_string(),
        )?;

        let mut removal_templates = vec![];
        let mut move_templates = vec![];

        let mut rendered_templates_cache = RenderedTemplatesCache::new();

        let application_package_json_path = library_base_path.parent().unwrap().join("package.json");
        let application_package_json_data = rendered_templates_cache
            .get(&application_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut application_package_json_to_write =
            serde_json::from_str::<ApplicationPackageJson>(&application_package_json_data)?;

        let project_package_json_path = library_base_path.join("package.json");
        let project_package_json_data = rendered_templates_cache
            .get(&project_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut project_json_to_write =
            serde_json::from_str::<ProjectPackageJson>(&project_package_json_data)?;

        if let Some(description) = description {
            change_description(&description, &mut manifest_data, &mut project_json_to_write)?;
        }

        if let Some(name) = name {
            move_templates.push(change_name(
                &library_base_path,
                &name,
                confirm,
                &mut manifest_data,
                &mut application_package_json_to_write,
                &mut project_json_to_write,
                &mut rendered_templates_cache,
                &mut removal_templates,
                &mut stdout,
            )?);
        }

        rendered_templates_cache.insert(
            application_package_json_path.to_string_lossy(),
            RenderedTemplate {
                path: application_package_json_path.to_path_buf(),
                content: serde_json::to_string_pretty(&application_package_json_to_write)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            config_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            project_package_json_path
                .clone()
                .to_string_lossy()
                .to_string(),
            RenderedTemplate {
                path: project_package_json_path.into(),
                content: serde_json::to_string_pretty(&project_json_to_write)?,
                context: None,
            },
        );

        let rendered_templates: Vec<RenderedTemplate> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        remove_template_files(&removal_templates, dryrun, &mut stdout)?;
        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;
        move_template_files(&move_templates, dryrun, &mut stdout)?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(
                stdout,
                "{} changed successfully!",
                &manifest_data.library_name
            )?;
            stdout.reset()?;
            format_code(&library_base_path, &manifest_data.runtime.parse()?);
        }

        Ok(())
    }
}
