use std::{path::Path, collections::HashSet,};

use anyhow::{Context, Result};
use clap::{ArgMatches};
use rustyline::{Editor, history::DefaultHistory};
use convert_case::{Case, Casing};
use toml::from_str as toml_from_str;
use termcolor::{StandardStream};

use crate::{
    // CliCommand,
    constants::{Database, Infrastructure,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
    },
    core::{
        ast::transformations::{
            transform_controllers_index_ts::transform_controllers_index_ts,
            transform_entities_index_ts::transform_entities_index_ts,
            transform_registrations_ts::transform_registrations_ts_add_router,
            transform_sdk_ts::transform_sdk_ts, 
            transform_seed_data_ts::transform_seed_data_ts,
            transform_seeders_index_ts::transform_seeders_index_ts,
            transform_server_ts::transform_server_ts,
        },
        base_path::{prompt_base_path},
        // command::command,
        database::{get_db_driver, is_in_memory_database},
        manifest::{
            ManifestData, ProjectType,
            application::ApplicationManifestData, 
            router::RouterManifestData,
            // add_project_definition_to_manifest,
            add_router_definition_to_manifest,
            InitializableManifestConfigMetadata,
            RouterInitializationMetadata,
            InitializableManifestConfig,
        },
        
    },
    prompt::{ArrayCompleter, prompt_comma_separated_list},
    sync::{constants::{DIRS_TO_IGNORE},
        utils::validate_addition_to_artifact,
    },
};

pub(crate) fn add_router_to_manifest_with_validation(
    manifest_data: &mut RouterManifestData,
    base_path: &Path,
    app_root_path: &Path,
    stdout: &mut StandardStream,
) -> Result<(ProjectType, String)> {
    let service_name = base_path.file_name().unwrap().to_str().unwrap();
    let service_data = manifest_data
        .projects
        .iter()
        .find(|project| service_name == project.name)
        .ok_or_else(|| anyhow::anyhow!("Service '{}' not found in manifest", service_name))?;
    
    let forklaunch_manifest_buffer =
        add_router_definition_to_manifest(manifest_data, &service_name.to_string())
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;

    let router_name = manifest_data.router_name.clone();
    let new_manifest_projects: HashSet<String> = manifest_data.projects
        .iter()
        .map(|project| project.name.clone())
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    
    let validation_result = validate_addition_to_artifact(
        &router_name,
        &new_manifest_projects,
        &format!("Successfully added {} to manifest.toml", router_name),
        &format!("Project {} was not added to manifest.toml", router_name),
        "sync:router:73",
        stdout,
    )?;
    if validation_result {
        Ok(forklaunch_manifest_buffer)
    } else {
        return Err(anyhow::anyhow!("Failed to add {} to manifest.toml", router_name))
    }
}
    
pub(crate) fn add_router_server_with_validation(
    manifest_data: &mut RouterManifestData,
    base_path: &Path,
) -> Result<String> {
    let content = transform_server_ts(manifest_data.router_name.as_str(), &base_path)?;
    Ok(content)
}

pub(crate) fn add_router_sdk_with_validation(
    manifest_data: &mut RouterManifestData,
    base_path: &Path,
) -> Result<String> {
    let content = transform_sdk_ts(manifest_data.router_name.as_str(), &base_path)?;
    Ok(content)
}

pub(crate) fn add_router_registrations_with_validation(
    manifest_data: &mut RouterManifestData,
    project_type: ProjectType,
    base_path: &Path,
) -> Result<String> {
    let content = transform_registrations_ts_add_router(
        manifest_data.router_name.as_str(),
        &project_type,
        &base_path,
    )?;
    Ok(content)
}

pub(crate) fn add_router_persistence_with_validation(
    manifest_data: &mut RouterManifestData,
    project_type: ProjectType,
    base_path: &Path,
) -> Result<(String, String, String)> {
    let entities_index_ts = transform_entities_index_ts(manifest_data.router_name.as_str(), &base_path)?;
    let seeders_index_ts = transform_seeders_index_ts(manifest_data.router_name.as_str(), &base_path)?;
    let seed_data_ts = transform_seed_data_ts(manifest_data.router_name.as_str(), &project_type, &base_path)?;
    Ok((entities_index_ts, seeders_index_ts, seed_data_ts))
}

pub(crate) fn add_router_controllers_with_validation(
    manifest_data: &mut RouterManifestData,
    base_path: &Path,
) -> Result<String> {
    let content = transform_controllers_index_ts(manifest_data.router_name.as_str(), &base_path)?;
    Ok(content)
}

pub(crate) fn sync_router_setup(
    router_name: &str, 
    app_root_path: &Path, 
    modules_path: &Path, 
    manifest_data: &mut ApplicationManifestData,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
) -> Result<RouterManifestData> {
    let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;

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
    let app_root_path_buf = app_root_path.clone().to_path_buf();
    let router_manifest_data: RouterManifestData = toml_from_str(&toml::to_string_pretty(&manifest_data).unwrap()).unwrap();
    let router_base_path = prompt_base_path(
        &app_root_path_buf,
        &ManifestData::Router(&router_manifest_data),
        Some(router_name.to_string()),
        &mut line_editor,
        &mut stdout,
        matches,
        1,
    )?;
    
    
    router_manifest_data = router_manifest_data.initialize(InitializableManifestConfigMetadata::Router(
        RouterInitializationMetadata {
            project_name: router_base_path
                .file_name()
                .unwrap()
                .to_string_lossy()
                .to_string()
                .clone(),
            router_name: Some(router_name.clone().to_string()),
        },
    ));
    
    let service_name = router_base_path.file_name().unwrap().to_str().unwrap();
    let service_data = manifest_data
        .projects
        .iter()
        .find(|project| service_name == project.name)
        .ok_or_else(|| anyhow::anyhow!("Service '{}' not found in manifest", service_name))?;
        

    if let Some(database) = service_data.resources.as_ref().unwrap().database.clone() {
        let database: Database = database.parse()?;
        let mut router_manifest_data: RouterManifestData = RouterManifestData {
            router_name: router_name.clone().to_string(),
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

            ..router_manifest_data
        };
    }
    Ok(router_manifest_data)
}

pub(crate) fn check_router_artifacts(
    base_path: &Path,
) -> Result<Vec<String>> {
    let mut router_artifacts_to_add = Vec::new();
    for router_artifact in vec![
        "server.ts",
        "sdk.ts",
        "registrations.ts",
        "persistence/entities/index.ts",
        "persistence/seeders/index.ts",
    ] {
        let path = base_path.join(router_artifact);
        if !path.exists() {
            router_artifacts_to_add.push(router_artifact.to_string());
        }
    }
    Ok(router_artifacts_to_add)
}

// TODO: Implement subcommand structure
// impl CliCommand for RouterCommand {
//     fn command(&self) -> Command {
//         command("router", "Sync a new router")
//             .alias("rt")
//             .alias("route")
//             .arg(
//                 Arg::new("name")
//                 .help("The name of the router"))
//             .arg(
//                 Arg::new("base_path")
//                     .short('p')
//                     .long("path")
//                     .help("The path to sync the router in"),
//             )
//             .arg(
//                 Arg::new("add")
//                     .short('a')
//                     .long("add")
//                     .help("Add a router to application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("remove")
//                     .short('r')
//                     .long("remove")
//                     .help("Remove a router from application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("artifacts")
//                     .short('f')
//                     .long("artifacts")
//                     .help("The artifacts to add to the router")
//                     .value_parser(Artifact::VARIANTS)
//                     .num_args(0..)
//                     .action(ArgAction::Append),
//             )
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
//                     .help("The description of the router"),
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
//             &mut stdout,
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
        
//         let manifest_data = sync_router_setup(&router_name, &base_path, &modules_path, &manifest_data, &mut stdout, matches)?;
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
//                         &router_name,
//                         &new_manifest_data,
//                         &modules_path,
//                         artifact,
//                         "router",
//                         manifest_data.runtime.clone(),
//                         &HashSet::new(),
//                         &mut rendered_templates,
//                         &mut stdout,
//                     )?;
//                 }
//                 if remove {
//                     if artifact == "manifest" {
//                         remove_project_definition_from_manifest(&mut new_manifest_data, &router_name)?;
//                     }
//                 }
//             }
//         }
//         // TODO: check for package.json in router directory and generate if it doesn't exist
//         Ok(())
        
//     }
// }
