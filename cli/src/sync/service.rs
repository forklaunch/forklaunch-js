use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::from_str;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{Database, ERROR_FAILED_TO_PARSE_MANIFEST},
    core::{
        base_path::{RequiredLocation, find_app_root_path, prompt_base_path},
        command::command,
        manifest::{ApplicationInitializationMetadata, InitializableManifestConfig, InitializableManifestConfigMetadata, ManifestData, ProjectType, application::ApplicationManifestData, add_project_to_manifest},
        package_json::project_package_json::ProjectPackageJson,
        rendered_template::RenderedTemplate,
        init::service::add_service_to_artifacts,
        universal_sdk::add_project_to_universal_sdk,
        sync::constants::DIRS_TO_IGNORE,
    },
    prompt::{ArrayCompleter, prompt_with_validation},
};

fn add_service_to_manifest_with_validation(
    manifest_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
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
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;
    let service_name = manifest_data.service_name.clone();
    let new_manifest_projects: HashSet<String> = manifest_data.projects.iter().map(|project| project.name.clone()).filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
    println!("sync:347 new_manifest_projects: {:?}", new_manifest_projects);
    if new_manifest_projects.contains(&service_name) {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "Successfully added {} to manifest.toml", service_name)?;
        stdout.reset()?;
        Ok(new_manifest_projects, forklaunch_manifest_buffer)   
    } else {
        println!("sync:349 difference: {:?}", new_manifest_projects.difference(&dir_project_names_set));
        return Err(anyhow::anyhow!("Project {} was not added to manifest.toml", service_name));
    }
}

fn add_service_to_docker_compose_with_validation(
    manifest_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
    docker_compose: Option<String>,
) -> Result<String> {
    let docker_compose_path = if let Some(docker_compose_path) = &manifest_data.docker_compose_path
    {
        app_root_path.join(docker_compose_path)
    } else {
        app_root_path.join("docker-compose.yaml")
    };

    let docker_compose_buffer =
        add_service_definition_to_docker_compose(manifest_data, app_root_path, docker_compose)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    
    let new_docker_services: HashSet<String> = docker_compose_buffer.services.keys().cloned().filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str())).collect();
    println!("sync:409 new_docker_services: {:?}", new_docker_services);
    if new_docker_services.contains(&service_name) {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "Successfully removed {} service(s) from docker-compose.yaml", services_to_remove_docker.len())?;
        stdout.reset()?;
        Ok(new_docker_services, docker_compose_buffer)
    } else {
        println!("sync:411 difference: {:?}", new_docker_services.difference(&dir_project_names_set));
        return Err(anyhow::anyhow!("Service {} was not added to docker-compose.yaml", service_name));
    }
}
    
pub(crate) fn add_service_to_runtime_files_with_validation(
    manifest_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
    dir_project_names_set: &HashSet<String>,
    stdout: &mut StandardStream,
) -> Result<(HashSet<String>, Option<String>, Option<String>)> {
    let runtime = manifest_data.runtime.parse()?;

    let mut package_json_buffer: Option<String> = None;
    let mut pnpm_workspace_buffer: Option<String> = None;

    match runtime {
        Runtime::Bun => {
            package_json_buffer = Some(
                add_project_definition_to_package_json(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
            );
            let new_package_json_projects: HashSet<String> = package_json_buffer.iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
            println!("sync:547 new_package_json_projects: {:?}", new_package_json_projects);
            if new_package_json_projects.contains(&service_name) {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Successfully added {} to package.json", service_name)?;
                stdout.reset()?;
                Ok(new_package_json_projects, package_json_buffer)
            } else {
                println!("sync:549 difference: {:?}", new_package_json_projects.difference(&dir_project_names_set));
                return Err(anyhow::anyhow!("Service {} was not added to package.json", service_name));
            }
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
            let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace_buffer.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            println!("sync:484 new_pnpm_workspace_projects: {:?}", new_pnpm_workspace_projects);
            if new_pnpm_workspace_projects.contains(&service_name) {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "Successfully added {} to pnpm-workspace.yaml", service_name)?;
                stdout.reset()?;
                Ok(new_pnpm_workspace_projects, pnpm_workspace_buffer)
            } else {
                println!("sync:486 difference: {:?}", new_pnpm_workspace_projects.difference(&dir_project_names_set));
                return Err(anyhow::anyhow!("Service {} was not added to pnpm-workspace.yaml", service_name));
            }
        }
    }

    Ok(new_runtime_projects, package_json_buffer, pnpm_workspace_buffer)
}

pub(crate) fn sync_service_setup(
    service_name: &str, 
    app_root_path: &Path, 
    modules_path: &Path, 
    manifest_data: &mut ApplicationManifestData, 
    rendered_templates: &mut Vec<RenderedTemplate>, 
    stdout: &mut StandardStream,
    docker_compose: Option<String>,
) -> Result<ServiceManifestData> {
    let database = prompt_with_validation(
        &mut line_editor,
        &mut stdout,
        "database",
        Some(&Database::VARIANTS),
        |input| Database::VARIANTS.contains(&input),
        |_| "Invalid database. Please try again".to_string(),
    )?;
    let infrastructure = prompt_comma_separated_list(
        &mut line_editor,
        &mut stdout,
        "infrastructure",
        Some(&Infrastructure::VARIANTS),
        |input| Infrastructure::VARIANTS.contains(&input),
        |_| "Invalid infrastructure. Please try again".to_string(),
    )?;
    let description = prompt_without_validation(
        &mut line_editor,
        &mut stdout,
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
    }
    let service_package_json_data = read_to_string(&service_package_json_path)?;
    let service_package_json: ProjectPackageJson = from_str(&service_package_json_data)?;
    
    let database = if database == "none" {
        // Try to detect database from package.json dependencies
        let package_json_path = modules_path.join(service_name).join("package.json");
        let package_json_content = read_to_string(&package_json_path)?;
        let full_package_json: ProjectPackageJson = from_str(&package_json_content)?;
        
        if let Some(deps) = &full_package_json.dependencies {
            // Check if any database variant is found in the dependencies
            let found_variant = Database::VARIANTS.iter()
                .find(|variant| {
                    // Check if any dependency key contains this database variant
                    deps.keys()
                        .any(|dep_key| dep_key.contains(variant))
                });
            
            if let Some(variant) = found_variant {
                variant.to_string()
            } else {
                "none".to_string()
            }
        } else {
            "none".to_string()
        }
    } else {
        database
    };

    let mut new_manifest_data: ServiceManifestData = ServiceManifestData {
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

        service_name: service_name.clone(),
        service_path: service_name.clone(),
        camel_case_name: service_name.to_case(Case::Camel),
        pascal_case_name: service_name.to_case(Case::Pascal),
        kebab_case_name: service_name.to_case(Case::Kebab),
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

    // rendered_templates.extend(
    //     add_service_to_artifacts(
    //         &mut new_manifest_data, 
    //         &modules_path, 
    //         &app_root_path,
    //         docker_compose)?);

    // add_project_to_universal_sdk(
    //     &mut rendered_templates, 
    //     &modules_path, 
    //     &manifest_data.app_name, 
    //     &manifest_data.service_name, 
    //     None)?;
    Ok((new_manifest_data))
}

// TODO: Implement subcommand structure
// impl CliCommand for ServiceCommand {
//     fn command(&self) -> Command {
//         command("service", "Sync a new service")
//             .alias("svc")
//             .alias("project")
//             .alias("proj")
//             .arg(Arg::new("name").help("The name of the service"))
//             .arg(
//                 Arg::new("database")
//                     .short('d')
//                     .long("database")
//                     .help("The database to use"))
//     }

//     fn handler(&self, matches: &ArgMatches) -> Result<()> {
//         let mut line_editor = Editor::<(), DefaultHistory>::new()?;
//         let mut stdout = StandardStream::stdout(ColorChoice::Always);
//         let mut rendered_templates = Vec::<RenderedTemplate>::new();
        
//         let service_name = prompt_with_validation(
//             &mut line_editor,
//             &mut stdout,
//             "name",
//             matches,
//             "service name",
//             None,
//             |input: &str| validate_name(input),
//             |_| "Invalid service name. Please try again".to_string(),
//         )?;
//         let database = prompt_with_validation(
//             &mut line_editor,
//             &mut stdout,
//             "database",
//             Some(&Database::VARIANTS),
//             |input| Database::VARIANTS.contains(&input),
//             |_| "Invalid database. Please try again".to_string(),
//         )?;        
//         add_service_to_manifest(service_name, &app_root_path, &modules_path, &manifest_data, &mut rendered_templates, &mut stdout)?;
//         Ok(())
//     }
// }