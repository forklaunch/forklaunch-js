use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use self::database::get_db_driver;
use crate::{
    CliCommand,
    constants::{
        Database, ERROR_DATABASE_INFORMATION, ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST, ERROR_FAILED_TO_ADD_ROUTER_TO_APP,
        ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_MANIFEST, Infrastructure,
    },
    core::{
        ast::transformations::{
            transform_entities_index_ts::transform_entities_index_ts,
            transform_registrations_ts::transform_registrations_ts_add_router,
            transform_sdk_ts::transform_sdk_ts, transform_seed_data_ts::transform_seed_data_ts,
            transform_seeders_index_ts::transform_seeders_index_ts,
            transform_server_ts::transform_server_ts,
        },
        base_path::find_app_root_path,
        command::command,
        database::{self, is_in_memory_database},
        format::format_code,
        manifest::{
            InitializableManifestConfig, InitializableManifestConfigMetadata, ManifestData,
            RouterInitializationMetadata, add_router_definition_to_manifest,
            router::RouterManifestData,
        },
        name::validate_name,
        rendered_template::{RenderedTemplate, write_rendered_templates},
        template::{PathIO, generate_with_template},
    },
    prompt::{ArrayCompleter, prompt_comma_separated_list, prompt_with_validation},
};

fn generate_basic_router(
    base_path: &Path,
    manifest_data: &mut RouterManifestData,
    service_name: &String,
    stdout: &mut StandardStream,
    dryrun: bool,
    manifest_path: &Path,
) -> Result<()> {
    let output_path = base_path.to_string_lossy().to_string();
    let template_dir = PathIO {
        input_path: Path::new("router").to_string_lossy().to_string(),
        output_path: output_path.clone(),
        module_id: None,
    };

    let ignore_files = vec![];
    let preserve_files = vec![];
    let ignore_dirs = vec![];

    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &ManifestData::Router(&manifest_data),
        &ignore_files,
        &ignore_dirs,
        &preserve_files,
        dryrun,
    )?;
    rendered_templates.extend(
        add_router_to_artifacts(manifest_data, base_path, service_name, manifest_path)
            .with_context(|| "Failed to add service metadata to artifacts")?,
    );

    write_rendered_templates(&rendered_templates, dryrun, stdout)
        .with_context(|| "Failed to write service files")?;

    Ok(())
}

fn add_router_to_artifacts(
    manifest_data: &mut RouterManifestData,
    base_path: &Path,
    service_name: &String,
    manifest_path: &Path,
) -> Result<Vec<RenderedTemplate>> {
    let (project_type, forklaunch_definition_buffer) =
        add_router_definition_to_manifest(manifest_data, service_name)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;

    let mut rendered_templates = Vec::new();

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("server.ts"),
        content: transform_server_ts(manifest_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_APP.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("sdk.ts"),
        content: transform_sdk_ts(manifest_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_APP.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("registrations.ts"),
        content: transform_registrations_ts_add_router(
            manifest_data.router_name.as_str(),
            &project_type,
            &base_path,
        )?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(&base_path)
            .join("persistence")
            .join("entities")
            .join("index.ts"),
        content: transform_entities_index_ts(manifest_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: base_path
            .join("persistence")
            .join("seeders")
            .join("index.ts"),
        content: transform_seeders_index_ts(manifest_data.router_name.as_str(), &base_path)?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("persistence").join("seed.data.ts"),
        content: transform_seed_data_ts(
            manifest_data.router_name.as_str(),
            &project_type,
            &base_path,
        )?,
        context: Some(ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: manifest_path.to_path_buf(),
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

        let current_dir = std::env::current_dir()?;
        let router_base_path = if let Some(relative_path) = matches.get_one::<String>("base_path") {
            current_dir.join(relative_path)
        } else {
            current_dir
        };

        let app_root_path = find_app_root_path(matches)?;
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data = from_str::<RouterManifestData>(
            &read_to_string(&manifest_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let router_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "router name",
            None,
            |input: &str| validate_name(input) && !manifest_data.app_name.contains(input),
            |_| {
                "Router name cannot be a substring of the application name, empty or include numbers or spaces. Please try again"
                    .to_string()
            },
        )?;

        manifest_data = manifest_data.initialize(InitializableManifestConfigMetadata::Router(
            RouterInitializationMetadata {
                project_name: router_base_path
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_string(),
                router_name: Some(router_name.clone()),
            },
        ));

        let infrastructure: Vec<Infrastructure> = if matches.ids().all(|id| id == "dryrun") {
            prompt_comma_separated_list(
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
            .collect()
        } else {
            vec![]
        };

        let service_name = router_base_path.file_name().unwrap().to_str().unwrap();
        let service_data = manifest_data
            .projects
            .iter()
            .find(|project| service_name == project.name)
            .ok_or_else(|| anyhow::anyhow!("Service '{}' not found in manifest", service_name))?;

        if let Some(database) = service_data.resources.as_ref().unwrap().database.clone() {
            let database: Database = database.parse()?;
            let mut manifest_data: RouterManifestData = RouterManifestData {
                router_name: router_name.clone(),
                camel_case_name: router_name.to_case(Case::Camel),
                pascal_case_name: router_name.to_case(Case::Pascal),
                kebab_case_name: router_name.to_case(Case::Kebab),

                database: database.to_string(),
                db_driver: get_db_driver(&database),

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
                is_s3_enabled: infrastructure.contains(&Infrastructure::S3),

                ..manifest_data
            };

            let dryrun = matches.get_flag("dryrun");
            generate_basic_router(
                &router_base_path,
                &mut manifest_data,
                &service_name.to_string(),
                &mut stdout,
                dryrun,
                &manifest_path,
            )
            .with_context(|| "Failed to create router")?;

            if !dryrun {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "{} initialized successfully!", router_name)?;
                stdout.reset()?;
                format_code(&router_base_path, &manifest_data.runtime.parse()?);
            }

            Ok(())
        } else {
            bail!(ERROR_DATABASE_INFORMATION)
        }
    }
}
