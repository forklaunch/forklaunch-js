use std::{path::Path, collections::HashSet};

use anyhow::{Context, Result};
use clap::{ArgMatches};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::from_str;
use toml::from_str as toml_from_str;
use termcolor::{StandardStream};
use convert_case::{Case, Casing};

use crate::{
    // CliCommand,
    constants::{Database, WorkerType, Runtime,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
    },
    core::{
        // base_path::{RequiredLocation, find_app_root_path, prompt_base_path},
        // command::command,
        database::{
            get_db_driver, 
            get_database_port,
            is_in_memory_database,
        },
        docker::{add_worker_definition_to_docker_compose, DockerCompose},
        manifest::{
            // InitializableManifestConfig, 
            // InitializableManifestConfigMetadata, 
            ProjectType, 
            application::ApplicationManifestData, 
            worker::WorkerManifestData,
            add_project_definition_to_manifest,
            ResourceInventory, ProjectMetadata,
        },
        package_json::{
            application_package_json::ApplicationPackageJson,
            add_project_definition_to_package_json,
        },
        pnpm_workspace::{
            PnpmWorkspace,
            add_project_definition_to_pnpm_workspace,
        },
        
        worker_type::{
            get_default_worker_options, get_worker_consumer_factory, get_worker_producer_factory,
            get_worker_type_name,
        },
    },
    prompt::{ArrayCompleter, prompt_with_validation, prompt_without_validation},
    sync::{constants::{DIRS_TO_IGNORE, 
        DOCKER_SERVICES_TO_IGNORE, 
        RUNTIME_PROJECTS_TO_IGNORE},
        utils::validate_addition_to_artifact,
    },
};

pub(crate) fn add_worker_to_manifest_with_validation(
    manifest_data: &mut WorkerManifestData,
    stdout: &mut StandardStream,
) -> Result<String> {
    let worker_name = manifest_data.worker_name.clone();
    let forklaunch_manifest_buffer = add_project_definition_to_manifest(
        ProjectType::Worker,
        manifest_data,
        Some(manifest_data.worker_type.clone()),
        Some(ResourceInventory {
            database: if manifest_data.is_database_enabled {
                Some(manifest_data.database.clone().unwrap())
            } else {
                None
            },
            cache: if manifest_data.is_cache_enabled {
                Some(manifest_data.worker_type_lowercase.clone())
            } else {
                None
            },
            queue: if manifest_data.is_kafka_enabled {
                Some(manifest_data.worker_type_lowercase.clone())
            } else {
                None
            },
            object_store: None,
        }),
        Some(vec![manifest_data.worker_name.clone()]),
        Some(ProjectMetadata {
            r#type: Some(manifest_data.worker_type_lowercase.clone()),
        }),
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;
    let temp: WorkerManifestData = toml_from_str(&forklaunch_manifest_buffer).unwrap();
    let new_manifest_projects: HashSet<String> = temp.projects
        .iter()
        .map(|project| project.name.clone())
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    
    let validation_result = validate_addition_to_artifact(
        &worker_name,
        &new_manifest_projects,
        &format!("Successfully added {} to manifest.toml", worker_name),
        &format!("Project {} was not added to manifest.toml", worker_name),
        "sync:worker:73",
        stdout,
    )?;
    if !validation_result {
        return Err(anyhow::anyhow!("Failed to add {} to manifest.toml", worker_name))
    }
    Ok(forklaunch_manifest_buffer)
}

pub(crate) fn add_worker_to_docker_compose_with_validation(
    manifest_data: &mut WorkerManifestData,
    app_root_path: &Path,
    docker_compose: &String,
    stdout: &mut StandardStream,
) -> Result<String> {

    let docker_compose_buffer =
        add_worker_definition_to_docker_compose(manifest_data, app_root_path, Some(docker_compose.clone()))
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    
    let temp: DockerCompose = from_str(&docker_compose_buffer).unwrap();
    let new_docker_services: HashSet<String> = temp
        .services
        .keys()
        .cloned()
        .filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str()))
        .collect();
    
    let validation_result = validate_addition_to_artifact(
        &manifest_data.worker_name,
        &new_docker_services,
        &format!("Successfully added {} to docker-compose.yaml", manifest_data.worker_name),
        &format!("Worker {} was not added to docker-compose.yaml", manifest_data.worker_name),
        "sync:worker:113",
        stdout,
    )?;
    if !validation_result {
        return Err(anyhow::anyhow!("Failed to add {} to docker-compose.yaml", manifest_data.worker_name))
    }
    Ok(docker_compose_buffer)
}
    
pub(crate) fn add_worker_to_runtime_files_with_validation(
    manifest_data: &mut WorkerManifestData,
    base_path: &Path,
    stdout: &mut StandardStream,
) -> Result<(Option<String>, Option<String>)> {
    let runtime = manifest_data.runtime.parse()?;

    let mut package_json_buffer: Option<String> = None;
    let mut pnpm_workspace_buffer: Option<String> = None;

    match runtime {
        Runtime::Bun => {
            package_json_buffer = Some(
                add_project_definition_to_package_json(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
            );
            let temp: ApplicationPackageJson = from_str(package_json_buffer.as_ref().unwrap()).unwrap();
            let new_package_json_projects: HashSet<String> = temp.workspaces.unwrap_or_default().iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
            
            let validation_result = validate_addition_to_artifact(
                &manifest_data.worker_name,
                &new_package_json_projects,
                &format!("Successfully added {} to package.json", manifest_data.worker_name),
                &format!("Worker {} was not added to package.json", manifest_data.worker_name),
                "sync:worker:145",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to package.json", manifest_data.worker_name));
            }
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
            let temp: PnpmWorkspace = from_str(pnpm_workspace_buffer.as_ref().unwrap()).unwrap();
            let new_pnpm_workspace_projects: HashSet<String> = temp.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            
            let validation_result = validate_addition_to_artifact(
                &manifest_data.worker_name,
                &new_pnpm_workspace_projects,
                &format!("Successfully added {} to pnpm-workspace.yaml", manifest_data.worker_name),
                &format!("Worker {} was not added to pnpm-workspace.yaml", manifest_data.worker_name),
                "sync:worker:484",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", manifest_data.worker_name));
            }
        }
    }

    Ok((package_json_buffer, pnpm_workspace_buffer))
}

pub(crate) fn sync_worker_setup(
    worker_name: &str, 
    manifest_data: &mut ApplicationManifestData,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
) -> Result<WorkerManifestData> {
    let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;

    let r#type: WorkerType = prompt_with_validation(
        &mut line_editor,
        stdout,
        "type",
        matches,
        "worker type",
        Some(&WorkerType::VARIANTS),
        |input| WorkerType::VARIANTS.contains(&input),
        |_| "Invalid worker type. Please try again".to_string(),
    )?.parse()?;

    let mut database: Option<Database> = None;
    if r#type == WorkerType::Database {
        database = Some(
            prompt_with_validation(
                &mut line_editor,
                stdout,
                "database",
                matches,
                "worker database type",
                Some(&Database::VARIANTS),
                |input| Database::VARIANTS.contains(&input),
                |_| "Invalid worker database type. Please try again".to_string(),
            )?
            .parse()?,
        );
    }

    let description = prompt_without_validation(
        &mut line_editor,
        stdout,
        "description",
        matches,
        "worker description (optional)",
        None,
    )?;

    let worker_data: WorkerManifestData = WorkerManifestData {
        // Common fields from ApplicationManifestData
        id: manifest_data.id.clone(),
        app_name: manifest_data.app_name.clone(),
        modules_path: manifest_data.modules_path.clone(),
        docker_compose_path: manifest_data.docker_compose_path.clone(),
        camel_case_app_name: manifest_data.camel_case_app_name.clone(),
        pascal_case_app_name: manifest_data.pascal_case_app_name.clone(),
        kebab_case_app_name: manifest_data.kebab_case_app_name.clone(),
        app_description: manifest_data.app_description.clone(),
        author: manifest_data.author.clone(),
        cli_version: manifest_data.cli_version.clone(),
        formatter: manifest_data.formatter.clone(),
        linter: manifest_data.linter.clone(),
        validator: manifest_data.validator.clone(),
        runtime: manifest_data.runtime.clone(),
        test_framework: manifest_data.test_framework.clone(),
        projects: manifest_data.projects.clone(),
        http_framework: manifest_data.http_framework.clone(),
        license: manifest_data.license.clone(),
        project_peer_topology: manifest_data.project_peer_topology.clone(),
        is_biome: manifest_data.is_biome,
        is_eslint: manifest_data.is_eslint,
        is_oxlint: manifest_data.is_oxlint,
        is_prettier: manifest_data.is_prettier,
        is_express: manifest_data.is_express,
        is_hyper_express: manifest_data.is_hyper_express,
        is_zod: manifest_data.is_zod,
        is_typebox: manifest_data.is_typebox,
        is_bun: manifest_data.is_bun,
        is_node: manifest_data.is_node,
        is_vitest: manifest_data.is_vitest,
        is_jest: manifest_data.is_jest,

        // Worker-specific fields
        worker_name: worker_name.clone().to_string(),
        camel_case_name: worker_name.to_case(Case::Camel),
        pascal_case_name: worker_name.to_case(Case::Pascal),
        kebab_case_name: worker_name.to_case(Case::Kebab),
        description: description.clone(),
        database: if let Some(database) = &database {
            Some(database.to_string())
        } else {
            None
        },
        db_driver: if let Some(database) = &database {
            Some(get_db_driver(&database))
        } else {
            None
        },
        database_port: if let Some(database) = &database {
            get_database_port(&database)
        } else {
            None
        },
        is_worker: true,
        is_cache_enabled: r#type == WorkerType::BullMQCache || r#type == WorkerType::RedisCache,
        is_database_enabled: r#type == WorkerType::Database,
        is_kafka_enabled: r#type == WorkerType::Kafka,

        is_postgres: if let Some(database) = &database {
            database == &Database::PostgreSQL
        } else {
            false
        },
        is_mongo: if let Some(database) = &database {
            database == &Database::MongoDB
        } else {
            false
        },
        is_mysql: if let Some(database) = &database {
            database == &Database::MySQL
        } else {
            false
        },
        is_mariadb: if let Some(database) = &database {
            database == &Database::MariaDB
        } else {
            false
        },
        is_mssql: if let Some(database) = &database {
            database == &Database::MsSQL
        } else {
            false
        },
        is_sqlite: if let Some(database) = &database {
            database == &Database::SQLite
        } else {
            false
        },
        is_better_sqlite: if let Some(database) = &database {
            database == &Database::BetterSQLite
        } else {
            false
        },
        is_libsql: if let Some(database) = &database {
            database == &Database::LibSQL
        } else {
            false
        },
        is_in_memory_database: if let Some(database) = &database {
            is_in_memory_database(database)
        } else {
            false
        },

        worker_type: get_worker_type_name(&r#type),
        worker_type_lowercase: get_worker_type_name(&r#type).to_lowercase(),
        default_worker_options: get_default_worker_options(&r#type),
        worker_consumer_factory: get_worker_consumer_factory(
            &r#type,
            &worker_name.to_case(Case::Pascal),
        ),
        worker_producer_factory: get_worker_producer_factory(&r#type),
    };
    Ok(worker_data)
}

// TODO: Implement subcommand structure
// impl CliCommand for WorkerCommand {
//     fn command(&self) -> Command {
//         command("worker", "Sync a new worker")
//             .alias("wk")
//             .alias("job")
//             .arg(
//                 Arg::new("name")
//                 .help("The name of the worker"))
//             .arg(
//                 Arg::new("base_path")
//                     .short('p')
//                     .long("path")
//                     .help("The path to sync the worker in"),
//             )
//             .arg(
//                 Arg::new("add")
//                     .short('a')
//                     .long("add")
//                     .help("Add a worker to application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("remove")
//                     .short('r')
//                     .long("remove")
//                     .help("Remove a worker from application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("artifacts")
//                     .short('f')
//                     .long("artifacts")
//                     .help("The artifacts to add to the worker")
//                     .value_parser(Artifact::VARIANTS)
//                     .num_args(0..)
//                     .action(ArgAction::Append),
//             )
//             .arg(
//                 Arg::new("worker_type")
//                     .short('t')
//                     .long("type")
//                     .help("The type of worker"))
//             .arg(
//                 Arg::new("database")
//                     .short('d')
//                     .long("database")
//                     .help("The database to use"))
//             .arg(
//                 Arg::new("infrastructure")
//                     .short('i')
//                     .long("infrastructure")
//                     .help("The infrastructure to use")
//                     .value_parser(Infrastructure::VARIANTS)
//                     .num_args(0..)
//                     .action(ArgAction::Append),
//             )
//             .arg(
//                 Arg::new("description")
//                     .short('D')
//                     .long("description")
//                     .help("The description of the worker"),
//             )
//     }

//     fn handler(&self, matches: &ArgMatches) -> Result<()> {
//         let mut line_editor = Editor::<(), DefaultHistory>::new()?;
//         let mut stdout = StandardStream::stdout(ColorChoice::Always);
        
//         let mut rendered_templates = Vec::<RenderedTemplate>::new();
        
//         let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Project)?;
        

//         let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");
//         let existing_manifest_data = from_str::<ApplicationManifestData>(
//             &read_to_string(&manifest_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
//         )
//         .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

//         let base_path = prompt_base_path(
//             &app_root_path,
//             &ManifestData::Application(&existing_manifest_data),
//             &None,
//             &mut line_editor,
//             stdout,
//             matches,
//             0,
//         )?;

//         let dir_project_names_set: HashSet<String> = find_project_dir_names(&base_path)?.iter().cloned().collect();

//         let manifest_data = existing_manifest_data.initialize(
//             InitializableManifestConfigMetadata::Application(ApplicationInitializationMetadata {
//                 app_name: existing_manifest_data.app_name.clone(),
//                 database: None,
//             }),
//         );
        
//         let manifest_data = sync_worker_setup(&worker_name, &base_path, &modules_path, &manifest_data, &mut stdout, matches)?;
//         let mut new_manifest_data = manifest_data.clone();
//         let add = matches.get_flag("add");
//         let remove = matches.get_flag("remove");
//         let artifacts = matches.get_many::<String>("artifacts");
//         // TODO: Implement artifact handling
//         // if "all" then sync all artifacts else sync only the specified artifacts
//         if artifacts.is_some() {
//             let artifacts = artifacts.unwrap();
//             if artifacts.contains("all") {
//                 artifacts = ARTIFACTS::VARIANTS.iter().map(|s| s.to_string()).collect();
//             }
//             for artifact in artifacts {
//                 if add {
//                     add_package_to_artifact(
//                         &worker_name,
//                         &new_manifest_data,
//                         &modules_path,
//                         artifact,
//                         "worker",
//                         manifest_data.runtime.clone(),
//                         &HashSet::new(),
//                         &mut rendered_templates,
//                         stdout,
//                     )?;
//                 }
//                 if remove {
//                     if artifact == "manifest" {
//                         remove_project_definition_from_manifest(&mut new_manifest_data, &worker_name)?;
//                     }
//                 }
//             }
//         }
//         // TODO: check for package.json in worker directory and generate if it doesn't exist
//         Ok(())
        
//     }
// }
