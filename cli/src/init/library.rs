use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use ramhorns::Content;
use rustyline::history::DefaultHistory;
use rustyline::Editor;
use serde::{Deserialize, Serialize};
use std::env::current_dir;
use std::fs::read_to_string;
use std::path::Path;
use termcolor::{ColorChoice, StandardStream};
use toml::from_str;

use crate::config_struct;
use crate::constants::{
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE, ERROR_FAILED_TO_CREATE_GITIGNORE,
    ERROR_FAILED_TO_CREATE_SYMLINKS, ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_GET_CWD,
    ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
};
use crate::prompt::{prompt_with_validation, prompt_without_validation, ArrayCompleter};

use super::core::config::ProjectConfig;
use super::core::gitignore::generate_gitignore;
use super::core::manifest::add_project_definition_to_manifest;
use super::core::package_json::add_project_definition_to_package_json;
use super::core::pnpm_workspace::add_project_definition_to_pnpm_workspace;
use super::core::rendered_template::{write_rendered_templates, RenderedTemplate};
use super::core::symlinks::generate_symlinks;
use super::core::template::{generate_with_template, PathIO, TemplateConfigData};
use super::core::tsconfig::generate_tsconfig;
use super::{forklaunch_command, CliCommand};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct LibraryConfigData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) library_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
    }
);

impl ProjectConfig for LibraryConfigData {
    fn name(&self) -> &String {
        &self.library_name
    }
}

#[derive(Debug)]
pub(super) struct LibraryCommand;

impl LibraryCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for LibraryCommand {
    fn command(&self) -> Command {
        forklaunch_command("library", "Initialize a new library")
            .alias("lib")
            .arg(Arg::new("name").help("The name of the library"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path to initialize the library in"),
            )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the service"),
            )
    }

    // pass token in from parent and perform get token above?
    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let library_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "Enter library name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Library name cannot be empty. Please try again".to_string(),
        )?;

        let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;
        let base_path = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "base_path",
            matches,
            "Enter base path (optional, press enter for current directory): ",
        )?;
        let base_path = if base_path.trim().is_empty() {
            current_path.to_str().unwrap().to_string()
        } else {
            base_path
        };

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "Enter library description (optional): ",
        )?;

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let mut config_data: LibraryConfigData = LibraryConfigData {
            library_name: library_name.clone(),
            description: description.clone(),

            ..from_str(&read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        };

        generate_basic_library(&library_name, &base_path.to_string(), &mut config_data)
            .with_context(|| "Failed to create library")?;
        Ok(())
    }
}

fn generate_basic_library(
    library_name: &String,
    base_path: &String,
    config_data: &mut LibraryConfigData,
) -> Result<()> {
    let output_path = Path::new(base_path)
        .join(library_name)
        .to_string_lossy()
        .to_string();

    let template_dir = PathIO {
        input_path: Path::new("project")
            .join("library")
            .to_string_lossy()
            .to_string(),
        output_path: output_path.clone(),
    };

    let ignore_files = vec![];

    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &TemplateConfigData::Library(config_data.clone()),
        &ignore_files,
    )?;
    rendered_templates
        .extend(generate_tsconfig(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_TSCONFIG)?);
    rendered_templates.extend(
        generate_gitignore(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?,
    );
    rendered_templates.extend(
        add_library_to_artifacts(config_data, base_path)
            .with_context(|| "Failed to add library metadata to artifacts")?,
    );

    write_rendered_templates(&rendered_templates)
        .with_context(|| "Failed to write library files")?;

    generate_symlinks(Some(base_path), &template_dir.output_path, config_data)
        .with_context(|| ERROR_FAILED_TO_CREATE_SYMLINKS)?;

    Ok(())
}

fn add_library_to_artifacts(
    config_data: &mut LibraryConfigData,
    base_path: &String,
) -> Result<Vec<RenderedTemplate>> {
    let forklaunch_definition_buffer = add_project_definition_to_manifest(config_data, None, None)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;
    let mut package_json_buffer: Option<String> = None;
    if config_data.runtime == "bun" {
        package_json_buffer = Some(
            add_project_definition_to_package_json(config_data, base_path)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
        );
    }
    let mut pnpm_workspace_buffer: Option<String> = None;
    if config_data.runtime == "node" {
        pnpm_workspace_buffer = Some(
            add_project_definition_to_pnpm_workspace(base_path, config_data)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
        );
    }

    let mut rendered_templates = Vec::new();
    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .join(".forklaunch")
            .join("manifest.toml"),
        content: forklaunch_definition_buffer,
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST.to_string()),
    });
    if let Some(package_json_buffer) = package_json_buffer {
        rendered_templates.push(RenderedTemplate {
            path: Path::new(base_path).join("package.json"),
            content: package_json_buffer,
            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON.to_string()),
        });
    }
    if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
        rendered_templates.push(RenderedTemplate {
            path: Path::new(base_path).join("pnpm-workspace.yaml"),
            content: pnpm_workspace_buffer,
            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE.to_string()),
        });
    }

    Ok(rendered_templates)
}
