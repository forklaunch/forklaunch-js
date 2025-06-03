use std::{
    fs::{read_to_string, remove_dir_all},
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_CREATE_PACKAGE_JSON, ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_WRITE_MANIFEST, Runtime,
    },
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        manifest::{
            ProjectType, application::ApplicationManifestData,
            remove_project_definition_from_manifest,
        },
        package_json::remove_project_definition_to_package_json,
        pnpm_workspace::remove_project_definition_to_pnpm_workspace,
        rendered_template::{RenderedTemplate, write_rendered_templates},
    },
    prompt::{ArrayCompleter, prompt_for_confirmation, prompt_with_validation},
};

#[derive(Debug)]
pub(super) struct LibraryCommand;

impl LibraryCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for LibraryCommand {
    fn command(&self) -> Command {
        command("library", "Initialize a new library")
            .alias("lib")
            .arg(Arg::new("name").help("The name of the library"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path to initialize the library in"),
            )
            .arg(
                Arg::new("continue")
                    .short('c')
                    .long("continue")
                    .help("Continue the eject operation")
                    .action(ArgAction::SetTrue),
            )
    }

    // pass token in from parent and perform get token above?
    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Anywhere,
            &BasePathType::Delete,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let mut manifest_data: ApplicationManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let library_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "library name",
            None,
            |input: &str| {
                manifest_data
                    .projects
                    .iter()
                    .any(|project| project.name == input && project.r#type == ProjectType::Library)
            },
            |_| "Library not found".to_string(),
        )?;

        let continue_delete_override = matches.get_flag("continue");

        if !continue_delete_override {
            let continue_delete = prompt_for_confirmation(
                &mut line_editor,
                "This operation is irreversible. Do you want to continue? (y/N) ",
            )?;

            if !continue_delete {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                writeln!(stdout, "Deletion cancelled")?;
                stdout.reset()?;
                return Ok(());
            }
        }

        let manifest_content =
            remove_project_definition_from_manifest(&mut manifest_data, &library_name)?;

        remove_dir_all(&base_path.join(&library_name))?;

        let mut rendered_templates = vec![RenderedTemplate {
            path: config_path,
            content: manifest_content,
            context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
        }];

        match manifest_data.runtime.parse()? {
            Runtime::Node => {
                rendered_templates.push(RenderedTemplate {
                    path: base_path.join("pnpm-workspace.yaml"),
                    content: remove_project_definition_to_pnpm_workspace(base_path, &library_name)?,
                    context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                });
            }
            Runtime::Bun => {
                rendered_templates.push(RenderedTemplate {
                    path: base_path.join("package.json"),
                    content: remove_project_definition_to_package_json(base_path, &library_name)?,
                    context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
                });
            }
        }

        write_rendered_templates(&rendered_templates, false, &mut stdout)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} deleted successfully!", library_name)?;
        stdout.reset()?;

        Ok(())
    }
}
