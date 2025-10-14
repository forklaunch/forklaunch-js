use std::{
    path::Path, 
    collections::HashSet, 
    fs::{read_to_string}, 
    io::{Write},
};

use anyhow::{Context, Result};
use clap::{ArgMatches};
use rustyline::{Editor, history::DefaultHistory};
use convert_case::{Case, Casing};
use serde_json::{from_str as json_from_str, to_string_pretty as json_to_string_pretty};
use serde_yml::{from_str as yaml_from_str, to_string as yaml_to_string};
use toml::{from_str as toml_from_str, to_string_pretty as toml_to_string_pretty};
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};

use crate::{
    // CliCommand,
    constants::{Database, Infrastructure, Runtime,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
    },
    core::{
        // base_path::{RequiredLocation, find_app_root_path, prompt_base_path},
        // command::command,
        database::{get_database_port, get_db_driver, is_in_memory_database},
        docker::{add_service_definition_to_docker_compose, DockerCompose},
        manifest::{
            ProjectType, 
            application::ApplicationManifestData, 
            service::ServiceManifestData,
            add_project_definition_to_manifest,
            ResourceInventory,
        },
        package_json::{
            project_package_json::ProjectPackageJson,
            application_package_json::ApplicationPackageJson,
            add_project_definition_to_package_json,
        },
        pnpm_workspace::{
            add_project_definition_to_pnpm_workspace,
            PnpmWorkspace,
        },
    },
    prompt::{ArrayCompleter, prompt_with_validation, prompt_without_validation, prompt_comma_separated_list},
    sync::{constants::{DIRS_TO_IGNORE, 
        DOCKER_SERVICES_TO_IGNORE, 
        RUNTIME_PROJECTS_TO_IGNORE},
        utils::validate_addition_to_artifact,
    },
};



pub(crate) fn add_service_to_manifest_with_validation(
    manifest_data: &mut ServiceManifestData,
    stdout: &mut StandardStream,
) -> Result<String> {
    let forklaunch_manifest_buffer = add_project_definition_to_manifest(
        ProjectType::Service,
        manifest_data,
        None,
        Some(ResourceInventory {
            database: Some(manifest_data.database.to_owned()),
            cache: None,
            queue: None,
            object_store: None,
        }),
        Some(vec![manifest_data.service_name.clone()]),
        None,
    )?;

    let service_name = manifest_data.service_name.clone();
    let new_manifest_projects: HashSet<String> = manifest_data.projects
        .iter()
        .map(|project| project.name.clone())
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    
    let validation_result = validate_addition_to_artifact(
        &service_name,
        &new_manifest_projects,
        &format!("Successfully added {} to manifest.toml", service_name),
        &format!("Project {} was not added to manifest.toml", service_name),
        "sync:service:85",
        stdout,
    )?;
    if validation_result {
        Ok(forklaunch_manifest_buffer)
    } else {
        return Err(anyhow::anyhow!("Failed to add {} to manifest.toml", service_name))
    }
}

pub(crate) fn add_service_to_docker_compose_with_validation(
    manifest_data: &mut ServiceManifestData,
    app_root_path: &Path,
    docker_compose: &String,
    stdout: &mut StandardStream,
) -> Result<String> {
    println!("sync:service:101 add_service_to_docker_compose_with_validation");

    let docker_compose_buffer =
        add_service_definition_to_docker_compose(manifest_data, app_root_path, Some(docker_compose.clone()))
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    println!("sync:service:106 docker compose buffer: {:?}", docker_compose_buffer);
    println!("sync:service:106 checking docker compose buffer");
    let temp: DockerCompose = yaml_from_str(&docker_compose_buffer)?;
    let new_docker_services: HashSet<String> = temp.services
        .keys()
        .cloned()
        .filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str()))
        .collect();
    
    let validation_result = validate_addition_to_artifact(
        &manifest_data.service_name,
        &new_docker_services,
        &format!("Successfully added {} to docker-compose.yaml", manifest_data.service_name),
        &format!("Service {} was not added to docker-compose.yaml", manifest_data.service_name),
        "sync:service:113",
        stdout,
    )?;
    if validation_result {
        Ok(docker_compose_buffer)
    } else {
        return Err(anyhow::anyhow!("Failed to add {} to docker-compose.yaml", manifest_data.service_name))
    }
}
    
pub(crate) fn add_service_to_runtime_files_with_validation(
    manifest_data: &mut ServiceManifestData,
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
            let temp: ApplicationPackageJson = json_from_str(package_json_buffer.as_ref().unwrap()).unwrap();
            let new_package_json_projects: HashSet<String> = temp.workspaces.unwrap_or_default().iter().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).cloned().collect();
            println!("sync:service:153 new_package_json_projects: {:?}", new_package_json_projects);
            let validation_result = validate_addition_to_artifact(
                &manifest_data.service_name,
                &new_package_json_projects,
                &format!("Successfully added {} to package.json", manifest_data.service_name),
                &format!("Service {} was not added to package.json", manifest_data.service_name),
                "sync:service:143",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to package.json", manifest_data.service_name))
            }
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
            let temp: PnpmWorkspace = yaml_from_str(pnpm_workspace_buffer.as_ref().unwrap()).unwrap();
            let new_pnpm_workspace_projects: HashSet<String> = temp.packages.iter().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).cloned().collect();
            
            let validation_result = validate_addition_to_artifact(
                &manifest_data.service_name,
                &new_pnpm_workspace_projects,
                &format!("Successfully added {} to pnpm-workspace.yaml", manifest_data.service_name),
                &format!("Service {} was not added to pnpm-workspace.yaml", manifest_data.service_name),
                "sync:service:164",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", manifest_data.service_name))
            }
        }
    }

    Ok((package_json_buffer, pnpm_workspace_buffer))
}

pub(crate) fn sync_service_setup(
    service_name: &str, 
    modules_path: &Path, 
    manifest_data: &mut ApplicationManifestData,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
) -> Result<ServiceManifestData> {
    let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
    println!("sync:service:195 sync_service_setup");
    println!("sync:service:195 service_name: {:?}", service_name);
    println!("sync:service:195 modules_path: {:?}", modules_path);

    let mut database_options = vec!["none"];
    database_options.extend_from_slice(&Database::VARIANTS);
    let database_input = prompt_with_validation(
        &mut line_editor,
        stdout,
        "database",
        matches,
        "database type",
        Some(&database_options),
        |input| database_options.contains(&input),
        |_| "Invalid database type. Please try again".to_string(),
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

    let description = prompt_without_validation(
        &mut line_editor,
        stdout,
        "description",
        matches,
        "service description (optional)",
        None,
    )?;

    let service_package_json_path = modules_path.join(service_name).join("package.json");
    if !service_package_json_path.exists() {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
        writeln!(stdout, "Service package.json not found in service directory. Please run `forklaunch sync service -i {}` to generate it.", service_name)?;
        stdout.reset()?;
        return Err(anyhow::anyhow!("Service package.json not found in service directory. Please run `forklaunch sync service -i {}` to generate it.", service_name))
    }
    let service_package_json_data = read_to_string(&service_package_json_path)?;
    let service_package_json: ProjectPackageJson = json_from_str(&service_package_json_data)?;
    println!("sync:service:237 service_package_json: {:?}", service_package_json);
    
    println!("sync:service:237 Try and get database from package.json");
    let database: Database = if database_input == "none" {
        // Try to detect database from package.json dependencies
        
        if let Some(deps) = &service_package_json.dependencies {
            // Check if any database variant is found in the dependencies
            let found_database = deps.databases.iter()
                .find(|db| {
                    // Check if this database enum matches any of the variants
                    Database::VARIANTS.contains(&db.to_string().as_str())
                });
            
            if let Some(database) = found_database {
                *database
            } else {
                return Err(anyhow::anyhow!("No database variant found in package.json dependencies"))
            }
        } else {
            return Err(anyhow::anyhow!("No dependencies found in package.json, please check initialize type and try again"))
        }
    } else {
        database_input.parse()?
    };
    println!("sync:260 database: {:?}", database);
    let new_manifest_data: ServiceManifestData = ServiceManifestData {
        // Common fields from ApplicationManifestData
        id: manifest_data.id.clone(),
        app_name: manifest_data.app_name.clone(),
        modules_path: manifest_data.modules_path.clone(),
        docker_compose_path: manifest_data.docker_compose_path.clone(),
        camel_case_app_name: manifest_data.camel_case_app_name.clone(),
        pascal_case_app_name: manifest_data.pascal_case_app_name.clone(),
        kebab_case_app_name: manifest_data.kebab_case_app_name.clone(),
        title_case_app_name: manifest_data.title_case_app_name.clone(),
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

        service_name: service_name.to_string(),
        service_path: service_name.to_string(),
        camel_case_name: service_name.to_case(Case::Camel),
        pascal_case_name: service_name.to_case(Case::Pascal),
        kebab_case_name: service_name.to_case(Case::Kebab),
        title_case_name: service_name.to_case(Case::Title),
        description: description.clone(),
        database: database.to_string(),
        database_port: get_database_port(&database),
        db_driver: get_db_driver(&database),

        is_mongo: database == Database::MongoDB,
        is_postgres: database == Database::PostgreSQL,
        is_sqlite: database == Database::SQLite,
        is_mysql: database == Database::MySQL,
        is_mariadb: database == Database::MariaDB,
        is_better_sqlite: database == Database::BetterSQLite,
        is_libsql: database == Database::LibSQL,
        is_mssql: database == Database::MsSQL,
        is_in_memory_database: is_in_memory_database(&database),

        is_iam: false,
        is_billing: false,
        is_cache_enabled: infrastructure.contains(&Infrastructure::Redis),
        is_s3_enabled: infrastructure.contains(&Infrastructure::S3),
        is_database_enabled: true,

        is_better_auth: false,
        is_stripe: false,
    };

    Ok(new_manifest_data)
}

// TODO: Implement subcommand structure
// impl CliCommand for ServiceCommand {
//     fn command(&self) -> Command {
//         command("service", "Sync a new service")
//             .alias("svc")
//             .alias("project")
//             .alias("proj")
//             .arg(
//                 Arg::new("name")
//                 .help("The name of the service"))
//             .arg(
//                 Arg::new("base_path")
//                     .short('p')
//                     .long("path")
//                     .help("The path to sync the service in"),
//             )
//             .arg(
//                 Arg::new("add")
//                     .short('a')
//                     .long("add")
//                     .help("Add a service to application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("remove")
//                     .short('r')
//                     .long("remove")
//                     .help("Remove a service from application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("artifacts")
//                     .short('f')
//                     .long("artifacts")
//                     .help("The artifacts to add to the service")
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
//                     .help("The description of the service"),
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
        
//         let manifest_data = sync_service_setup(&service_name, &base_path, &modules_path, &manifest_data, &mut stdout, matches)?;
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
//                         &service_name,
//                         &new_manifest_data,
//                         &modules_path,
//                         artifact,
//                         "service",
//                         manifest_data.runtime.clone(),
//                         &HashSet::new(),
//                         &mut rendered_templates,
//                         stdout,
//                     )?;
//                 }
//                 if remove {
//                     if artifact == "manifest" {
//                         remove_project_definition_from_manifest(&mut new_manifest_data, &service_name)?;
//                     }
//                 }
//             }
//         }
//         // TODO: check for package.json in service directory and generate if it doesn't exist
//         Ok(())
        
//     }
// }