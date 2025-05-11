use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::to_string_pretty;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE, ERROR_FAILED_TO_CREATE_GITIGNORE,
        ERROR_FAILED_TO_CREATE_LIBRARY_PACKAGE_JSON, ERROR_FAILED_TO_CREATE_SYMLINKS,
        ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_MANIFEST, Runtime, TestFramework,
    },
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        gitignore::generate_gitignore,
        manifest::{
            ManifestData, ProjectType, add_project_definition_to_manifest,
            application::ApplicationManifestData, library::LibraryManifestData,
        },
        name::validate_name,
        package_json::{
            add_project_definition_to_package_json,
            package_json_constants::{
                ESLINT_VERSION, PROJECT_BUILD_SCRIPT, PROJECT_DOCS_SCRIPT, TSX_VERSION,
                TYPESCRIPT_ESLINT_VERSION, project_clean_script, project_format_script,
                project_lint_fix_script, project_lint_script, project_test_script,
            },
            project_package_json::{ProjectDevDependencies, ProjectPackageJson, ProjectScripts},
        },
        pnpm_workspace::add_project_definition_to_pnpm_workspace,
        rendered_template::{RenderedTemplate, write_rendered_templates},
        symlinks::generate_symlinks,
        template::{PathIO, generate_with_template},
        tsconfig::generate_tsconfig,
    },
    prompt::{ArrayCompleter, prompt_with_validation, prompt_without_validation},
};

fn generate_basic_library(
    library_name: &String,
    base_path: &String,
    config_data: &mut LibraryManifestData,
    stdout: &mut StandardStream,
    dryrun: bool,
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
    let ignore_dirs = vec![];
    let preserve_files = vec![];

    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &ManifestData::Library(&config_data),
        &ignore_files,
        &ignore_dirs,
        &preserve_files,
        dryrun,
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

    write_rendered_templates(&rendered_templates, dryrun, stdout)
        .with_context(|| "Failed to write library files")?;

    generate_symlinks(
        Some(base_path),
        &template_dir.output_path,
        config_data,
        dryrun,
    )
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

    let runtime = config_data.runtime.parse()?;

    let mut package_json_buffer: Option<String> = None;
    let mut pnpm_workspace_buffer: Option<String> = None;

    match runtime {
        Runtime::Bun => {
            package_json_buffer = Some(
                add_project_definition_to_package_json(config_data, base_path)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
            );
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, config_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
        }
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
    let test_framework: Option<TestFramework> =
        if let Some(test_framework) = &config_data.test_framework {
            Some(test_framework.parse()?)
        } else {
            None
        };
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
            clean: Some(project_clean_script(&config_data.runtime.parse()?)),
            docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
            format: Some(project_format_script(&config_data.formatter.parse()?)),
            lint: Some(project_lint_script(&config_data.linter.parse()?)),
            lint_fix: Some(project_lint_fix_script(&config_data.linter.parse()?)),
            test: project_test_script(&config_data.runtime.parse()?, &test_framework),
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
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
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
            "library name",
            None,
            |input: &str| validate_name(input),
            |_| "Library name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let base_path = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Library,
            &BasePathType::Init,
        )?;

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "library description (optional)",
        )?;

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let existing_manifest_data: ApplicationManifestData =
            from_str(&read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let mut config_data: LibraryManifestData = LibraryManifestData {
            // Common fields from ApplicationManifestData
            id: existing_manifest_data.id.clone(),
            app_name: existing_manifest_data.app_name.clone(),
            app_description: existing_manifest_data.app_description.clone(),
            author: existing_manifest_data.author.clone(),
            cli_version: existing_manifest_data.cli_version.clone(),
            formatter: existing_manifest_data.formatter.clone(),
            linter: existing_manifest_data.linter.clone(),
            validator: existing_manifest_data.validator.clone(),
            runtime: existing_manifest_data.runtime.clone(),
            test_framework: existing_manifest_data.test_framework.clone(),
            projects: existing_manifest_data.projects.clone(),
            http_framework: existing_manifest_data.http_framework.clone(),
            license: existing_manifest_data.license.clone(),
            project_peer_topology: existing_manifest_data.project_peer_topology.clone(),
            is_biome: existing_manifest_data.is_biome,
            is_eslint: existing_manifest_data.is_eslint,
            is_oxlint: existing_manifest_data.is_oxlint,
            is_prettier: existing_manifest_data.is_prettier,
            is_express: existing_manifest_data.is_express,
            is_hyper_express: existing_manifest_data.is_hyper_express,
            is_zod: existing_manifest_data.is_zod,
            is_typebox: existing_manifest_data.is_typebox,
            is_bun: existing_manifest_data.is_bun,
            is_node: existing_manifest_data.is_node,
            is_vitest: existing_manifest_data.is_vitest,
            is_jest: existing_manifest_data.is_jest,

            // Library-specific fields
            library_name: library_name.clone(),
            camel_case_name: library_name.to_case(Case::Camel),
            description: description.clone(),
        };

        let dryrun = matches.get_flag("dryrun");
        generate_basic_library(
            &library_name,
            &base_path.to_string(),
            &mut config_data,
            &mut stdout,
            dryrun,
        )
        .with_context(|| "Failed to create library")?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "{} initialized successfully!", library_name)?;
            stdout.reset()?;
        }

        Ok(())
    }
}
