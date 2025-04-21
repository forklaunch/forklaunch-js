use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::Context;
use clap::{Arg, Command};
use dialoguer::{theme::ColorfulTheme, MultiSelect};
use rustyline::{history::DefaultHistory, Editor};
use serde_json::Value;
use termcolor::{ColorChoice, StandardStream};

use super::common::{description::change_description, name::change_name};
use crate::{
    constants::{
        Database, ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        manifest::{service::ServiceManifestData, MutableManifestData},
        rendered_template::{write_rendered_templates, RenderedTemplate},
    },
    prompt::{prompt_field_from_selections_with_validation, ArrayCompleter},
    CliCommand,
};

fn change_database(
    base_path: &Path,
    database: &str,
    manifest_data: &mut MutableManifestData,
) -> anyhow::Result<RenderedTemplate> {
    Ok(RenderedTemplate {
        path: base_path.join("database.rs"),
        content: toml::to_string_pretty(&manifest_data)?,
        context: None,
    })
}

#[derive(Debug)]
pub(super) struct ServiceCommand;

impl ServiceCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ServiceCommand {
    fn command(&self) -> Command {
        command("service", "Change a forklaunch service")
            .alias("svc")
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
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use"),
            )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the service"),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> anyhow::Result<()> {
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

        let mut manifest_data: ServiceManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let name = matches.get_one::<String>("name");
        let database = matches.get_one::<String>("database");
        let description = matches.get_one::<String>("description");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if !matches.args_present() {
            let options = vec!["name", "database", "description"];

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

        let database = prompt_field_from_selections_with_validation(
            "database",
            database,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter database: ",
            Some(&Database::VARIANTS),
            |_input: &str| true,
            |_| "Invalid database. Please try again".to_string(),
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

        let mut rendered_templates = vec![];

        let application_package_json_path = base_path.join("package.json");
        let application_package_json_data = read_to_string(&application_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;

        let mut application_json_to_write =
            serde_json::from_str::<Value>(&application_package_json_data)?;

        if let Some(name) = name {
            rendered_templates.push(change_name(
                &base_path,
                &name,
                &mut MutableManifestData::Service(&mut manifest_data),
            )?);
        }
        if let Some(database) = database {
            rendered_templates.push(change_database(
                &base_path,
                &database,
                &mut MutableManifestData::Service(&mut manifest_data),
            )?);
        }
        if let Some(description) = description {
            change_description(&description, &mut application_json_to_write);
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
