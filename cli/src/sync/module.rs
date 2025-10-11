use std::{path::Path, collections::HashSet,};

use anyhow::{Result, Context};
use clap::{ArgMatches};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::from_str;
use toml::from_str as toml_from_str;
use termcolor::{StandardStream};
use convert_case::{Case, Casing};

use crate::{
    // CliCommand,
    constants::{
        Runtime, Module, Database,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
        get_service_module_cache,
        get_service_module_name,
        get_service_module_description,
    },
    core::{
        // base_path::{RequiredLocation, find_app_root_path, prompt_base_path},
        database::{
            get_database_variants,
            get_database_port, get_db_driver, is_in_memory_database,
        },
        docker::{add_service_definition_to_docker_compose, DockerCompose},
        manifest::{ 
            ProjectType, 
            application::ApplicationManifestData, 
            add_project_definition_to_manifest,
            service::ServiceManifestData,
            ResourceInventory,
        },
        package_json::{
            application_package_json::ApplicationPackageJson,
            add_project_definition_to_package_json,
        },
        pnpm_workspace::{
            add_project_definition_to_pnpm_workspace,
            PnpmWorkspace,
        },
        prompt::{
            prompt_with_validation,
        },
        
        template::{
            get_routers_from_standard_package,
        },
    },
    sync::{constants::{DIRS_TO_IGNORE, 
                RUNTIME_PROJECTS_TO_IGNORE,
                DOCKER_SERVICES_TO_IGNORE,
            },
            utils::validate_addition_to_artifact,
        },
};

pub(crate) fn add_module_to_manifest_with_validation(
    service_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
    stdout: &mut StandardStream,
) -> Result<String> {
    let module_name = service_data.service_name.clone();
    let module: Module = module_name.parse()?;
    let forklaunch_manifest_buffer = add_project_definition_to_manifest(
        ProjectType::Service,
        service_data,
        Some(module_name.clone().to_string()),
        Some(ResourceInventory {
            database: Some(service_data.database.to_string()),
            cache: get_service_module_cache(&module),
            queue: None,
            object_store: None,
        }),
        get_routers_from_standard_package(module),
        None,
    )?;
    let temp: ServiceManifestData = toml_from_str(&forklaunch_manifest_buffer).unwrap();

    let new_manifest_projects: HashSet<String> = temp.projects
        .iter()
        .map(|project| project.name.clone())
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();

    let validation_result = validate_addition_to_artifact(
        &module_name,
        &new_manifest_projects,
        &format!("Successfully added {} to manifest.toml", module_name),
        &format!("Project {} was not added to manifest.toml", module_name),
        "sync:module:73",
        &mut stdout,
    )?;
    if validation_result {
        Ok(forklaunch_manifest_buffer)
    } else {
        return Err(anyhow::anyhow!("Failed to add {} to manifest.toml", module_name))
    }
}

pub(crate) fn add_module_to_docker_compose_with_validation(
    service_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
    stdout: &mut StandardStream,
) -> Result<String> {
    let docker_compose_path = if let Some(docker_compose_path) = &service_data.docker_compose_path {
        app_root_path.join(docker_compose_path)
    } else {
        app_root_path.join("docker-compose.yaml")
    };
    let docker_compose_buffer = add_service_definition_to_docker_compose(&service_data, &app_root_path, None)?;
    let temp: DockerCompose = from_str(&docker_compose_buffer).unwrap();
    let new_docker_services: HashSet<String> = temp.services.keys().cloned().filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str())).collect();
    let validation_result = validate_addition_to_artifact(
        &service_data.service_name,
        &new_docker_services,
        &format!("Successfully added {} to docker-compose.yaml", service_data.service_name),
        &format!("Service {} was not added to docker-compose.yaml", service_data.service_name),
        "sync:module:100",
        &mut stdout,
    )?;
    if validation_result {
        Ok(docker_compose_buffer)
    } else {
        return Err(anyhow::anyhow!("Failed to add {} to docker-compose.yaml", service_data.service_name))
    }
}
    
pub(crate) fn add_module_to_runtime_files_with_validation(
    service_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
    dir_project_names_set: &HashSet<String>,
    stdout: &mut StandardStream,
) -> Result<(Option<String>, Option<String>)> {
    let runtime = service_data.runtime.parse()?;

    let mut package_json_buffer: Option<String> = None;
    let mut pnpm_workspace_buffer: Option<String> = None;

    match runtime {
        Runtime::Bun => {
            package_json_buffer = Some(
                add_project_definition_to_package_json(base_path, service_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
            );
            let temp: ApplicationPackageJson = from_str(&package_json_buffer.unwrap()).unwrap();
            let new_package_json_projects: HashSet<String> = temp.workspaces.unwrap_or_default().iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
            
            let validation_result = validate_addition_to_artifact(
                &service_data.service_name,
                &new_package_json_projects,
                &format!("Successfully added {} to package.json", service_data.service_name),
                &format!("Module {} was not added to package.json", service_data.service_name),
                "sync:module:145",
                &mut stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to package.json", service_data.service_name))
            }
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, service_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
            let temp: PnpmWorkspace = from_str(&pnpm_workspace_buffer.unwrap()).unwrap();
            let new_pnpm_workspace_projects: HashSet<String> = temp.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
                
            let validation_result = validate_addition_to_artifact(
                &service_data.service_name,
                &new_pnpm_workspace_projects,
                &RUNTIME_PROJECTS_TO_IGNORE,
                &format!("Successfully added {} to pnpm-workspace.yaml", service_data.service_name),
                &format!("Module {} was not added to pnpm-workspace.yaml", service_data.service_name),
                "sync:module:484",
                &mut stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", service_data.service_name))
            }
        }
    }

    Ok((package_json_buffer, pnpm_workspace_buffer))
}

pub(crate) fn sync_module_setup(
    module_name: &str, 
    app_root_path: &Path, 
    modules_path: &Path, 
    manifest_data: &mut ApplicationManifestData,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
) -> Result<ServiceManifestData> {
    let mut line_editor = Editor::<(), DefaultHistory>::new()?;

    let runtime = manifest_data.runtime.parse()?;
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
    let module: Module = module_name.parse()?;

    let mut service_data = ServiceManifestData {
        id: manifest_data.id.clone(),
        cli_version: manifest_data.cli_version.clone(),
        app_name: manifest_data.app_name.clone(),
        modules_path: manifest_data.modules_path.clone(),
        docker_compose_path: manifest_data.docker_compose_path.clone(),
        camel_case_app_name: manifest_data.camel_case_app_name.clone(),
        pascal_case_app_name: manifest_data.pascal_case_app_name.clone(),
        kebab_case_app_name: manifest_data.kebab_case_app_name.clone(),
        service_name: get_service_module_name(&module),
        service_path: get_service_module_name(&module),
        camel_case_name: get_service_module_name(&module).to_case(Case::Camel),
        pascal_case_name: get_service_module_name(&module).to_case(Case::Pascal),
        kebab_case_name: get_service_module_name(&module).to_case(Case::Kebab),
        formatter: manifest_data.formatter.clone(),
        linter: manifest_data.linter.clone(),
        validator: manifest_data.validator.clone(),
        http_framework: manifest_data.http_framework.clone(),
        runtime: manifest_data.runtime.clone(),
        test_framework: manifest_data.test_framework.clone(),
        projects: manifest_data.projects.clone(),
        project_peer_topology: manifest_data.project_peer_topology.clone(),
        author: manifest_data.author.clone(),
        app_description: manifest_data.app_description.clone(),
        license: manifest_data.license.clone(),
        description: get_service_module_description(&manifest_data.app_name, &module),

        is_eslint: manifest_data.is_eslint,
        is_biome: manifest_data.is_biome,
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

    // rendered_templates.extend(
    //     add_module_to_artifacts(
    //         &mut new_manifest_data, 
    //         &modules_path, 
    //         &app_root_path)?);

    // add_project_to_universal_sdk(
    //     &mut rendered_templates, 
    //     &modules_path, 
    //     &manifest_data.app_name, 
    //     &manifest_data.library_name, 
    //     None)?;
    Ok(service_data)
}

// TODO: Implement subcommand structure
// impl CliCommand for ModuleCommand {
//     fn command(&self) -> Command {
//         command("module", "Sync a new module")
//             .alias("mod")
//             .alias("lib")
//             .arg(
//                 Arg::new("name")
//                 .help("The name of the module"))
//             .arg(
//                 Arg::new("base_path")
//                     .short('p')
//                     .long("path")
//                     .help("The path to sync the module in"),
//             )
//             .arg(
//                 Arg::new("add")
//                     .short('a')
//                     .long("add")
//                     .help("Add a module to application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("remove")
//                     .short('r')
//                     .long("remove")
//                     .help("Remove a module from application artifacts")
//                     .action(ArgAction::SetTrue),
//             )
//             .arg(
//                 Arg::new("artifacts")
//                     .short('f')
//                     .long("artifacts")
//                     .help("The artifacts to add to the module")
//                     .value_parser(Artifact::VARIANTS)
//                     .num_args(0..)
//                     .action(ArgAction::Append),
//             )
//             .arg(
//                 Arg::new("description")
//                     .short('D')
//                     .long("description")
//                     .help("The description of the module"),
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
        
//         let manifest_data = sync_module_setup(&module_name, &base_path, &modules_path, &manifest_data, &mut stdout, matches)?;
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
//                         &module_name,
//                         &new_manifest_data,
//                         &modules_path,
//                         artifact,
//                         "module",
//                         manifest_data.runtime.clone(),
//                         &HashSet::new(),
//                         &mut rendered_templates,
//                         &mut stdout,
//                     )?;
//                 }
//                 if remove {
//                     if artifact == "manifest" {
//                         remove_project_definition_from_manifest(&mut new_manifest_data, &module_name)?;
//                     }
//                 }
//             }
//         }
//         // TODO: check for package.json in module directory and generate if it doesn't exist
//         Ok(())
        
//     }
// }
