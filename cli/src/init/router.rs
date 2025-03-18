use std::{fs::read_to_string, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use ramhorns::Content;
use rustyline::{history::DefaultHistory, Editor};
use serde::{Deserialize, Serialize};
use std::io::Write;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use crate::{
    config_struct,
    constants::{
        ERROR_DATABASE_INFORMATION, ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST, ERROR_FAILED_TO_ADD_ROUTER_TO_APP,
        ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_MANIFEST,
    },
    core::{
        base_path::{prompt_base_path, BasePathLocation},
        manifest::ProjectType,
    },
    prompt::{prompt_with_validation, ArrayCompleter},
};

use self::database::match_database;

use super::{
    command,
    core::{
        ast::{
            transform_app_ts, transform_bootstrapper_ts, transform_constants_data_ts,
            transform_entities_index_ts, transform_seeders_index_ts,
        },
        database,
        manifest::add_router_definition_to_manifest,
        rendered_template::{write_rendered_templates, RenderedTemplate},
        template::{generate_with_template, PathIO, TemplateManifestData},
    },
    CliCommand,
};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct RouterManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) router_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) pascal_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) kebab_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) db_driver: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mongo: bool,
    }
);

#[derive(Debug)]
pub(super) struct RouterCommand;

impl RouterCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for RouterCommand {
    fn command(&self) -> Command {
        command("router", "Initialize a new router")
            .alias("controller")
            .alias("routes")
            .arg(Arg::new("name").help("The name of the router"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The service path to initialize the router in. This path must be in a service directory"),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let router_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "Enter router name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Router name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let base_path = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Router,
        )?;

        let path = Path::new(&base_path);
        let config_path = path
            .parent()
            .unwrap_or_else(|| path)
            .join(".forklaunch")
            .join("manifest.toml");

        let manifest_data: RouterManifestData =
            from_str(&read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let service_name = path.file_name().unwrap().to_str().unwrap();
        let service_data = manifest_data
            .projects
            .iter()
            .find(|project| service_name == project.name)
            .unwrap();

        if let Some(database) = service_data.resources.as_ref().unwrap().database.clone() {
            let mut config_data: RouterManifestData = RouterManifestData {
                router_name: router_name.clone(),
                camel_case_name: router_name.to_case(Case::Camel),
                pascal_case_name: router_name.to_case(Case::Pascal),
                kebab_case_name: router_name.to_case(Case::Kebab),

                database: database.clone(),
                db_driver: match_database(&database),
                is_mongo: database == "mongodb",
                is_postgres: database == "postgresql",

                ..manifest_data
            };

            let dryrun = matches.get_flag("dryrun");
            generate_basic_router(
                &base_path.to_string(),
                &mut config_data,
                &service_name.to_string(),
                dryrun,
            )
            .with_context(|| "Failed to create router")?;

            if !dryrun {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "{} initialized successfully!", router_name)?;
                stdout.reset()?;
            }

            Ok(())
        } else {
            bail!(ERROR_DATABASE_INFORMATION)
        }
    }
}

fn generate_basic_router(
    base_path: &String,
    config_data: &mut RouterManifestData,
    service_name: &String,
    dryrun: bool,
) -> Result<()> {
    let output_path = Path::new(base_path).to_string_lossy().to_string();
    let template_dir = PathIO {
        input_path: Path::new("router").to_string_lossy().to_string(),
        output_path: output_path.clone(),
    };

    let ignore_files = vec![];
    let preserve_files = vec![];
    let ignore_dirs = vec![];

    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &TemplateManifestData::Router(&config_data),
        &ignore_files,
        &ignore_dirs,
        &preserve_files,
        dryrun,
    )?;
    rendered_templates.extend(
        // check if this also adds to app and bootstrapper
        add_router_to_artifacts(config_data, base_path, service_name)
            .with_context(|| "Failed to add service metadata to artifacts")?,
    );

    write_rendered_templates(&rendered_templates, dryrun)
        .with_context(|| "Failed to write service files")?;

    Ok(())
}

fn add_router_to_artifacts(
    config_data: &mut RouterManifestData,
    base_path: &String,
    service_name: &String,
) -> Result<Vec<RenderedTemplate>> {
    let (project_type, forklaunch_definition_buffer) =
        add_router_definition_to_manifest(config_data, service_name)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;

    let is_worker = project_type == ProjectType::Worker;

    let mut rendered_templates = Vec::new();

    rendered_templates.push(RenderedTemplate {
        path: Path::new(&base_path).join("server.ts"),
        content: transform_app_ts(config_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_APP.to_string()),
    });

    let cache_backend = if is_worker {
        config_data.projects.iter().any(|worker| {
            if let Some(resources) = &worker.resources {
                resources.cache.is_some()
            } else {
                false
            }
        })
    } else {
        false
    };

    rendered_templates.push(RenderedTemplate {
        path: Path::new(&base_path).join("bootstrapper.ts"),
        content: transform_bootstrapper_ts(
            config_data.router_name.as_str(),
            is_worker,
            cache_backend,
            &base_path,
        )?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(&base_path)
            .join("models")
            .join("persistence")
            .join("index.ts"),
        content: transform_entities_index_ts(config_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .join("models")
            .join("seeders")
            .join("index.ts"),
        content: transform_seeders_index_ts(config_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path).join("constants").join("seed.data.ts"),
        content: transform_constants_data_ts(
            config_data.router_name.as_str(),
            is_worker,
            &base_path,
        )?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .parent()
            .unwrap()
            .join(".forklaunch")
            .join("manifest.toml"),
        content: forklaunch_definition_buffer,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST.to_string()),
    });

    Ok(rendered_templates)
}
