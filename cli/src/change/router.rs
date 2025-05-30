use std::{io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use dialoguer::{MultiSelect, theme::ColorfulTheme};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use super::core::change_name::change_name_in_files;
use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST, Runtime},
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        format::format_code,
        manifest::{
            InitializableManifestConfig, InitializableManifestConfigMetadata, ProjectEntry,
            RouterInitializationMetadata, router::RouterManifestData,
        },
        name::validate_name,
        removal_template::{RemovalTemplate, remove_template_files},
        rendered_template::{RenderedTemplate, RenderedTemplatesCache, write_rendered_templates},
    },
    prompt::{ArrayCompleter, prompt_field_from_selections_with_validation},
};

#[derive(Debug)]
pub(super) struct RouterCommand;

impl RouterCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

pub(crate) fn change_name(
    base_path: &Path,
    existing_name: &str,
    new_name: &str,
    confirm: bool,
    runtime: &Runtime,
    project_entry: &mut ProjectEntry,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Vec<RemovalTemplate>> {
    change_name_in_files(
        base_path,
        existing_name,
        new_name,
        runtime,
        confirm,
        project_entry,
        rendered_templates_cache,
    )
}

impl CliCommand for RouterCommand {
    fn command(&self) -> Command {
        command("router", "Change a forklaunch router")
            .alias("controller")
            .alias("routes")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The service path"),
            )
            .arg(
                Arg::new("existing-name")
                    .short('e')
                    .help("The original name of the router"),
            )
            .arg(
                Arg::new("new-name")
                    .short('N')
                    .help("The new name of the router"),
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
        let mut rendered_templates_cache = RenderedTemplatesCache::new();

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Router,
            &BasePathType::Change,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path
            .parent()
            .unwrap()
            .join(".forklaunch")
            .join("manifest.toml");

        let existing_name = matches.get_one::<String>("existing-name");
        let new_name = matches.get_one::<String>("new-name");
        let dryrun = matches.get_flag("dryrun");
        let confirm = matches.get_flag("confirm");

        let project_name = base_path.file_name().unwrap().to_string_lossy().to_string();
        let mut manifest_data = toml::from_str::<RouterManifestData>(
            &rendered_templates_cache
                .get(&config_path)
                .with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?
                .unwrap()
                .content,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        .initialize(InitializableManifestConfigMetadata::Router(
            RouterInitializationMetadata {
                router_name: existing_name.unwrap().clone(),
                project_name: project_name.clone(),
            },
        ));

        let selected_options = if matches.ids().all(|id| id == "dryrun" || id == "confirm") {
            let options = vec!["name"];

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

        let new_name = prompt_field_from_selections_with_validation(
            "new-name",
            new_name,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "router name",
            None,
            |input: &str| validate_name(input) && !manifest_data.app_name.contains(input),
            |_| {
                "Router name cannot be a substring of the application name, empty or include numbers or spaces. Please try again"
                    .to_string()
            },
        )?;

        let mut removal_templates = vec![];

        if let Some(new_name) = new_name {
            removal_templates.extend(change_name(
                &base_path,
                &existing_name.unwrap(),
                &new_name,
                confirm,
                &manifest_data.runtime.parse()?,
                &mut manifest_data
                    .projects
                    .iter_mut()
                    .find(|project| project.name == project_name)
                    .unwrap(),
                &mut rendered_templates_cache,
            )?);
        }

        rendered_templates_cache.insert(
            config_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
                context: None,
            },
        );

        let rendered_templates: Vec<RenderedTemplate> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        remove_template_files(&removal_templates, dryrun, &mut stdout)?;
        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            stdout.reset()?;
            format_code(&base_path, &manifest_data.runtime.parse()?);
        }

        Ok(())
    }
}
