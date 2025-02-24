use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use convert_case::{Case, Casing};
use ramhorns::Content;
use rustyline::history::DefaultHistory;
use rustyline::Editor;
use serde::{Deserialize, Serialize};
use serde_json::to_string_pretty;
use std::fs::read_to_string;
use std::io::Write;
use std::path::Path;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use crate::config_struct;
use crate::constants::{
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE, ERROR_FAILED_TO_CREATE_GITIGNORE,
    ERROR_FAILED_TO_CREATE_LIBRARY_PACKAGE_JSON, ERROR_FAILED_TO_CREATE_SYMLINKS,
    ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
};
use crate::core::base_path::{prompt_base_path, BasePathLocation};
use crate::core::manifest::{ProjectManifestConfig, ProjectType};
use crate::prompt::{prompt_with_validation, prompt_without_validation, ArrayCompleter};

use super::core::gitignore::generate_gitignore;
use super::core::manifest::add_project_definition_to_manifest;
use super::core::package_json::add_project_definition_to_package_json;
use super::core::package_json::package_json_constants::{
    project_clean_script, project_test_script, ESLINT_VERSION, PROJECT_BUILD_SCRIPT,
    PROJECT_DOCS_SCRIPT, PROJECT_FORMAT_SCRIPT, PROJECT_LINT_FIX_SCRIPT, PROJECT_LINT_SCRIPT,
    TSX_VERSION, TYPESCRIPT_ESLINT_VERSION,
};
use super::core::package_json::project_package_json::{
    ProjectDevDependencies, ProjectPackageJson, ProjectScripts,
};
use super::core::pnpm_workspace::add_project_definition_to_pnpm_workspace;
use super::core::rendered_template::{write_rendered_templates, RenderedTemplate};
use super::core::symlinks::generate_symlinks;
use super::core::template::{generate_with_template, PathIO, TemplateManifestData};
use super::core::tsconfig::generate_tsconfig;
use super::{command, CliCommand};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct LibraryManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) library_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
    }
);

impl ProjectManifestConfig for LibraryManifestData {
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
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Library name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let base_path = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Library,
        )?;

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

        let mut config_data: LibraryManifestData = LibraryManifestData {
            library_name: library_name.clone(),
            camel_case_name: library_name.to_case(Case::Camel),
            description: description.clone(),

            ..from_str(&read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        };

        generate_basic_library(&library_name, &base_path.to_string(), &mut config_data)
            .with_context(|| "Failed to create library")?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} initialized successfully!", library_name)?;
        stdout.reset()?;

        Ok(())
    }
}

fn generate_basic_library(
    library_name: &String,
    base_path: &String,
    config_data: &mut LibraryManifestData,
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
        &TemplateManifestData::Library(&config_data),
        &ignore_files,
    )?;
    rendered_templates.push(generate_library_package_json(config_data, &output_path)?);
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
    config_data: &mut LibraryManifestData,
    base_path: &String,
) -> Result<Vec<RenderedTemplate>> {
    let forklaunch_definition_buffer =
        add_project_definition_to_manifest(ProjectType::Library, config_data, None, None, None)
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

fn generate_library_package_json(
    config_data: &LibraryManifestData,
    base_path: &String,
) -> Result<RenderedTemplate> {
    let package_json_buffer = ProjectPackageJson {
        name: Some(format!(
            "@{}/{}",
            config_data.app_name, config_data.library_name
        )),
        version: Some("0.1.0".to_string()),
        description: Some(config_data.description.clone()),
        keywords: Some(vec![]),
        license: Some(config_data.license.clone()),
        author: Some(config_data.author.clone()),
        scripts: Some(ProjectScripts {
            build: Some(PROJECT_BUILD_SCRIPT.to_string()),
            clean: Some(project_clean_script(&config_data.runtime).to_string()),
            docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
            format: Some(PROJECT_FORMAT_SCRIPT.to_string()),
            lint: Some(PROJECT_LINT_SCRIPT.to_string()),
            lint_fix: Some(PROJECT_LINT_FIX_SCRIPT.to_string()),
            test: Some(project_test_script(&config_data.test_framework).to_string()),
            ..Default::default()
        }),
        dev_dependencies: Some(ProjectDevDependencies {
            eslint: Some(ESLINT_VERSION.to_string()),
            tsx: Some(TSX_VERSION.to_string()),
            typescript_eslint: Some(TYPESCRIPT_ESLINT_VERSION.to_string()),
            ..Default::default()
        }),
        ..Default::default()
    };
    Ok(RenderedTemplate {
        path: Path::new(base_path).join("package.json"),
        content: to_string_pretty(&package_json_buffer)?.to_string(),
        context: Some(ERROR_FAILED_TO_CREATE_LIBRARY_PACKAGE_JSON.to_string()),
    })
}
