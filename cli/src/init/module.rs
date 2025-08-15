use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use super::service::generate_service_package_json;
use crate::{
    CliCommand,
    constants::{
        Database, ERROR_FAILED_TO_CREATE_PACKAGE_JSON, ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE, ERROR_FAILED_TO_WRITE_MANIFEST, Module, Runtime,
        get_service_module_cache, get_service_module_description, get_service_module_name,
    },
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        database::{
            get_database_port, get_database_variants, get_db_driver, is_in_memory_database,
        },
        docker::add_service_definition_to_docker_compose,
        format::format_code,
        manifest::{
            ApplicationInitializationMetadata, InitializableManifestConfig,
            InitializableManifestConfigMetadata, ManifestData, ProjectType, ResourceInventory,
            add_project_definition_to_manifest, application::ApplicationManifestData,
            service::ServiceManifestData,
        },
        modules::{ModuleConfig, validate_modules},
        package_json::add_project_definition_to_package_json,
        pnpm_workspace::add_project_definition_to_pnpm_workspace,
        rendered_template::{RenderedTemplate, write_rendered_templates},
        symlinks::generate_symlinks,
        template::{PathIO, generate_with_template, get_routers_from_standard_package},
    },
    prompt::{ArrayCompleter, prompt_with_validation},
};

#[derive(Debug)]
pub(super) struct ModuleCommand;

impl ModuleCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ModuleCommand {
    fn command(&self) -> Command {
        command("module", "Initialize a preconfigured module")
            .alias("mod")
            .arg(Arg::new("name").help("The name of the module"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path to initialize the module in"),
            )
            .arg(
                Arg::new("module")
                    .short('m')
                    .long("module")
                    .value_parser(Module::VARIANTS)
                    .help("The module to initialize"),
            )
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use")
                    .value_parser(Database::VARIANTS),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("module_folder")
                    .short('f')
                    .long("module-folder")
                    .help("The folder to store the module in")
            )
    }

    // pass token in from parent and perform get token above?
    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        
        // base path should be the application path
        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Application,
            &BasePathType::Init,
        )?;
        let base_path = Path::new(&base_path_input);
        // println!("00: base_path: {:?}", base_path);

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");
        // println!("01: config_path: {:?}", config_path);
        let existing_manifest_data = toml::from_str::<ApplicationManifestData>(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        .initialize(InitializableManifestConfigMetadata::Application(
            ApplicationInitializationMetadata {
                app_name: base_path.file_name().unwrap().to_string_lossy().to_string(),
                database: None,
            },
        ));

        let module: Module = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "module",
            matches,
            "module",
            Some(&Module::VARIANTS),
            |input| {
                let mut modules = existing_manifest_data.projects.iter().filter_map(|project| {
                    if let Some(variant) = &project.variant {
                        return variant.parse::<Module>().ok()
                    }
                    None
                }).collect::<Vec<Module>>();
                modules.push(input.parse().unwrap());
                validate_modules(&modules, &mut ModuleConfig::default()).is_ok()
            },
            |input| format!("Conflicting module type selected. You will not be able to add this module without deleting the existing module, {}", get_service_module_name(&input.parse().unwrap())),
        )?
        .parse()?;

        let runtime = existing_manifest_data.runtime.parse()?;
        let database_variants = get_database_variants(&runtime);

        let database: Database = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "database",
            matches,
            "database",
            Some(database_variants),
            |input| database_variants.contains(&input),
            |_| "Invalid database type. Please try again".to_string(),
        )?
        .parse()?;

        let dryrun = matches.get_flag("dryrun");

        // Default output path should be src/modules/(module_name)
        let src_path = base_path.join("src");
        let destination_path = if let Some(module_folder) = matches.get_one::<String>("module_folder") {
            base_path.join(Path::new(&module_folder))
        } else if src_path.exists() && src_path.is_dir() {
            src_path
                .join("modules")
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(
                stdout,
                "No 'src' folder in project root. Please confirm where module will be initialized."
            )?;
            stdout.reset()?;
            let temp_path: String = prompt_with_validation(
                &mut line_editor,
                &mut stdout,
                "destination_path",
                matches,
                "Confirm where module will be initialized:",
                Some(&["src/modules", "modules"]),
                |input| {
                    let path = Path::new(&input);
                    if let Some(parent) = path.parent() {
                        parent.exists() || parent.to_str().is_some()
                    } else {
                        false
                    }
                },
                |_| "Invalid path. Please provide a valid destination path.".to_string(),
            )?;
            base_path.join(Path::new(&temp_path)).to_path_buf()
        };
        // println!("02: destination_path: {:?}", destination_path);

        let name = existing_manifest_data.app_name.clone();

        let mut service_data = ServiceManifestData {
            id: existing_manifest_data.id.clone(),
            cli_version: existing_manifest_data.cli_version.clone(),
            app_name: name.clone(),
            camel_case_app_name: existing_manifest_data.camel_case_app_name.clone(),
            pascal_case_app_name: existing_manifest_data.pascal_case_app_name.clone(),
            kebab_case_app_name: existing_manifest_data.kebab_case_app_name.clone(),
            service_name: get_service_module_name(&module),
            camel_case_name: get_service_module_name(&module).to_case(Case::Camel),
            pascal_case_name: get_service_module_name(&module).to_case(Case::Pascal),
            kebab_case_name: get_service_module_name(&module).to_case(Case::Kebab),
            formatter: existing_manifest_data.formatter.clone(),
            linter: existing_manifest_data.linter.clone(),
            validator: existing_manifest_data.validator.clone(),
            http_framework: existing_manifest_data.http_framework.clone(),
            runtime: existing_manifest_data.runtime.clone(),
            test_framework: existing_manifest_data.test_framework.clone(),
            projects: existing_manifest_data.projects.clone(),
            project_peer_topology: existing_manifest_data.project_peer_topology.clone(),
            author: existing_manifest_data.author.clone(),
            app_description: existing_manifest_data.app_description.clone(),
            license: existing_manifest_data.license.clone(),
            description: get_service_module_description(&name, &module),

            is_eslint: existing_manifest_data.is_eslint,
            is_biome: existing_manifest_data.is_biome,
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

            is_postgres: database == Database::PostgreSQL,
            is_sqlite: database == Database::SQLite,
            is_mysql: database == Database::MySQL,
            is_mariadb: database == Database::MariaDB,
            is_better_sqlite: database == Database::BetterSQLite,
            is_libsql: database == Database::LibSQL,
            is_mssql: database == Database::MsSQL,
            is_mongo: database == Database::MongoDB,
            is_in_memory_database: is_in_memory_database(&database),

            database: database.to_string(),
            database_port: get_database_port(&database),
            db_driver: get_db_driver(&database),

            is_iam: module.clone() == Module::BaseIam || module.clone() == Module::BetterAuthIam,
            is_billing: module.clone() == Module::BaseBilling
                || module.clone() == Module::StripeBilling,
            is_cache_enabled: module.clone() == Module::BaseBilling
                || module.clone() == Module::StripeBilling,
            is_s3_enabled: false,
            is_database_enabled: true,

            is_better_auth: module.clone() == Module::BetterAuthIam,
            is_stripe: module.clone() == Module::StripeBilling,
        };

        let manifest_data = add_project_definition_to_manifest(
            ProjectType::Service,
            &mut service_data,
            Some(module.clone().to_string()),
            Some(ResourceInventory {
                database: Some(database.to_string()),
                cache: get_service_module_cache(&module),
                queue: None,
                object_store: None,
            }),
            get_routers_from_standard_package(module.clone()),
            None,
        )?;

        let template_dir = PathIO {
            input_path: Path::new("project")
                .join(&module.metadata().exclusive_files.unwrap().first().unwrap())
                .to_string_lossy()
                .to_string(),
            output_path: destination_path
                .join(get_service_module_name(&module))
                .to_string_lossy()
                .to_string(),
            module_id: Some(module.clone()),
        };
        // println!("03: template_dir: {:?}", template_dir);

        let mut rendered_templates = vec![];
        // println!("04: config_path: {:?}", config_path);
        rendered_templates.push(RenderedTemplate {
            path: config_path.clone(),
            content: manifest_data,
            context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
        });
        // println!("docker-compose.yaml: {:?}", base_path.join("docker-compose.yaml"));
        rendered_templates.push(RenderedTemplate {
            path: base_path.join("docker-compose.yaml"),
            content: add_service_definition_to_docker_compose(&service_data, base_path, None)?,
            context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
        });
        // println!("05: template_dir: {:?}", template_dir);
        rendered_templates.extend(generate_with_template(
            None,
            &template_dir,
            &ManifestData::Service(&service_data),
            &vec![],
            &vec![],
            &vec![],
            dryrun,
        )?);
        // println!("06 destination_path: {:?}", destination_path);
        // println!("07 service_name: {:?}", get_service_module_name(&module));
        rendered_templates.push(generate_service_package_json(
            &service_data,
            &destination_path.join(get_service_module_name(&module)),
            None,
            None,
            None,
            None,
        )?);

        match runtime {
            Runtime::Node => {
                rendered_templates.push(RenderedTemplate {
                    path: base_path.join("pnpm-workspace.yaml"),
                    content: add_project_definition_to_pnpm_workspace(base_path, &service_data)?,
                    context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                });
            }
            Runtime::Bun => {
                rendered_templates.push(RenderedTemplate {
                    path: base_path.join("package.json"),
                    content: add_project_definition_to_package_json(base_path, &service_data)?,
                    context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
                });
            }
        }

        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;
        // println!("module:08: base_path: {:?}", base_path);
        // println!("module:09: destination_path: {:?}", destination_path);
        if !dryrun {
            generate_symlinks(
                Some(base_path),
                &destination_path.join(get_service_module_name(&module)),
                &mut service_data,
                dryrun,
            )?;
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(
                stdout,
                "{} initialized successfully!",
                get_service_module_name(&module)
            )?;
            stdout.reset()?;
            format_code(&base_path, &service_data.runtime.parse()?);
        }

        Ok(())
    }
}
