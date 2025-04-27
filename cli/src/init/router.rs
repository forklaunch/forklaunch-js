use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use rustyline::{history::DefaultHistory, Editor};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use self::database::match_database;
use crate::{
    constants::{
        Database, Infrastructure, ERROR_DATABASE_INFORMATION,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST, ERROR_FAILED_TO_ADD_ROUTER_TO_APP,
        ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_MANIFEST,
    },
    core::{
        ast::transformations::{
            transform_app_ts::transform_app_ts,
            transform_entities_index_ts::transform_entities_index_ts,
            transform_registrations_ts::transform_registrations_ts,
            transform_seed_data_ts::transform_seed_data_ts,
            transform_seeders_index_ts::transform_seeders_index_ts,
        },
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        database::{self, is_in_memory_database},
        manifest::{
            add_router_definition_to_manifest, router::RouterManifestData, ManifestData,
            ProjectType,
        },
        rendered_template::{write_rendered_templates, RenderedTemplate},
        template::{generate_with_template, PathIO},
    },
    prompt::{prompt_comma_separated_list, prompt_with_validation, ArrayCompleter},
    CliCommand,
};

fn generate_basic_router(
    base_path: &String,
    config_data: &mut RouterManifestData,
    service_name: &String,
    stdout: &mut StandardStream,
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
        &ManifestData::Router(&config_data),
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

    write_rendered_templates(&rendered_templates, dryrun, stdout)
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
        content: transform_app_ts(config_data.router_name.as_str(), is_worker, &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_APP.to_string()),
    });

    let is_cache_enabled = if is_worker {
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
        path: Path::new(&base_path).join("registrations.ts"),
        content: transform_registrations_ts(
            config_data.router_name.as_str(),
            is_worker,
            is_cache_enabled,
            &base_path,
        )?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(&base_path)
            .join("persistence")
            .join("entities")
            .join("index.ts"),
        content: transform_entities_index_ts(config_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .join("persistence")
            .join("seeders")
            .join("index.ts"),
        content: transform_seeders_index_ts(config_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .join("persistence")
            .join("seed.data.ts"),
        content: transform_seed_data_ts(config_data.router_name.as_str(), is_worker, &base_path)?,
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
            .arg(Arg::new("base_path").short('p').long("path").help(
                "The service path to initialize the router. This path must be a service directory",
            ))
            .arg(
                Arg::new("infrastructure")
                    .short('i')
                    .long("infrastructure")
                    .help("Add optional infrastructure to the service")
                    .value_parser(Infrastructure::VARIANTS)
                    .num_args(0..)
                    .action(ArgAction::Append),
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

        let infrastructure: Vec<Infrastructure> = prompt_comma_separated_list(
            &mut line_editor,
            "infrastructure",
            matches,
            &Infrastructure::VARIANTS,
            None,
            "additional infrastructure components",
            true,
        )?
        .iter()
        .map(|s| s.parse().unwrap())
        .collect();

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

        // this needs to handle non database router cases -- for workers
        if let Some(database) = service_data.resources.as_ref().unwrap().database.clone() {
            let database: Database = database.parse()?;
            let mut config_data: RouterManifestData = RouterManifestData {
                router_name: router_name.clone(),
                camel_case_name: router_name.to_case(Case::Camel),
                pascal_case_name: router_name.to_case(Case::Pascal),
                kebab_case_name: router_name.to_case(Case::Kebab),

                database: database.to_string(),
                db_driver: match_database(&database),

                is_mongo: database == Database::MongoDB,
                is_postgres: database == Database::PostgreSQL,
                is_mysql: database == Database::MySQL,
                is_mariadb: database == Database::MariaDB,
                is_mssql: database == Database::MsSQL,
                is_sqlite: database == Database::SQLite,
                is_better_sqlite: database == Database::BetterSQLite,
                is_libsql: database == Database::LibSQL,
                is_in_memory_database: is_in_memory_database(&database),

                is_cache_enabled: infrastructure.contains(&Infrastructure::Redis),

                ..manifest_data
            };

            let dryrun = matches.get_flag("dryrun");
            generate_basic_router(
                &base_path.to_string(),
                &mut config_data,
                &service_name.to_string(),
                &mut stdout,
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
