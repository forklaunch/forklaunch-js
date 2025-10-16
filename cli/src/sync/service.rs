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
    CliCommand,
    constants::{Database, Infrastructure, Runtime, InitializeType,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
        ERROR_FAILED_TO_READ_MANIFEST, 
        ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_WRITE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE,
        ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE,
        ERROR_FAILED_TO_READ_PNPM_WORKSPACE,
        ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
        ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
    },
    core::{
        base_path::{RequiredLocation, find_app_root_path, prompt_base_path},
        command::command,
        database::{get_database_port, get_db_driver, is_in_memory_database},
        docker::{add_service_definition_to_docker_compose, DockerCompose},
        manifest::{
            ProjectType, ManifestData,
            application::ApplicationManifestData, 
            service::ServiceManifestData,
            add_project_definition_to_manifest,
            ResourceInventory,
        },
        package_json::{
            project_package_json::ProjectPackageJson,
            application_package_json::ApplicationPackageJson,
            add_project_definition_to_package_json,
            add_project_definition_to_package_json_mut,
        },
        pnpm_workspace::{
            add_project_definition_to_pnpm_workspace,
            add_project_definition_to_pnpm_workspace_mut,
            PnpmWorkspace,
        },
        rendered_template::{RenderedTemplate, RenderedTemplatesCache, write_rendered_templates},
        universal_sdk::{read_universal_sdk_content, add_project_vec_to_universal_sdk, remove_project_vec_from_universal_sdk},
    },
    init::service::generate_service_package_json,
    prompt::{ArrayCompleter, prompt_with_validation, prompt_without_validation, prompt_comma_separated_list},
    sync::{constants::{DIRS_TO_IGNORE, 
        DOCKER_SERVICES_TO_IGNORE, 
        RUNTIME_PROJECTS_TO_IGNORE,
        ARTIFACTS,
    },
        utils::{validate_addition_to_artifact, add_package_to_artifact, remove_package_from_artifact},
    },
};

enum ArtifactModification {
    Add,
    Remove,
}

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

// For use later
pub(crate) fn add_service_to_runtime_files_mut_with_validation(
    package_json: &mut ApplicationPackageJson,
    runtime: &Runtime,
    package_name: &str,
    stdout: &mut StandardStream,
    pnpm_workspace: Option<&mut PnpmWorkspace>,
) -> Result<()> {
    match runtime {
        Runtime::Bun => {
            add_project_definition_to_package_json_mut(
                package_json,
                &package_name,)?;
            let new_package_json_projects: HashSet<String> = package_json.workspaces
                .as_ref()
                .unwrap_or(&Vec::new())
                .iter()
                .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
                .cloned()
                .collect();
            let validation_result = validate_addition_to_artifact(
                &package_name,
                &new_package_json_projects,
                &format!("Successfully added {} to package.json", package_name),
                &format!("Service {} was not added to package.json", package_name),
                "sync:service:86",
                stdout,
            )?;
            if !validation_result {
                return Err(anyhow::anyhow!("Failed to add {} to package.json", package_name));
            }
        }
        Runtime::Node => {
            if let Some(pnpm_workspace) = pnpm_workspace {
                add_project_definition_to_pnpm_workspace_mut(
                    pnpm_workspace, &package_name)?;
                let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages
                    .iter()
                    .filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str()))
                    .cloned()
                    .collect();
                let validation_result = validate_addition_to_artifact(
                    &package_name,
                    &new_pnpm_workspace_projects,
                    &format!("Successfully added {} to pnpm-workspace.yaml", package_name),
                    &format!("Service {} was not added to pnpm-workspace.yaml", package_name),
                    "sync:service:245",
                    stdout,
                )?;
                if !validation_result {
                    return Err(anyhow::anyhow!("Failed to add {} to pnpm-workspace.yaml", package_name));
                }
            }
        }
    }
    Ok(())
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

fn is_service_in_manifest(
    manifest_data: &ApplicationManifestData,
    service_name: &str,
) -> Result<bool> {
    let manifest_project_names: HashSet<String> = manifest_data.projects.iter().map(|project| project.name.clone()).collect();
    if manifest_project_names.contains(service_name) {
        return Ok(true)
    }
    return Ok(false)
}

fn is_service_in_docker_compose(
    docker_compose: &DockerCompose,
    service_name: &str,
) -> Result<bool> {
    let docker_services: HashSet<String> = docker_compose.services.keys().cloned().collect();
    if docker_services.contains(service_name) {
        return Ok(true)
    }
    return Ok(false)
}

fn is_service_in_runtime_files(
    runtime: &Runtime,
    pnpm_workspace: Option<&PnpmWorkspace>,
    package_json: &ApplicationPackageJson,
    service_name: &str,
) -> Result<bool> {
    match runtime {
        Runtime::Bun => {
            let package_json_projects: HashSet<String> = package_json.workspaces.unwrap_or_default().iter().collect();
            if package_json_projects.contains(service_name) {
                return Ok(true)
            }
        }
        Runtime::Node => {
            let pnpm_workspace_projects: HashSet<String> = pnpm_workspace.unwrap().packages.iter().collect();
            if pnpm_workspace_projects.contains(service_name) {
                return Ok(true)
            }
        }
    }
    return Ok(false)
}

// TODO: is_service_in_universal_sdk

fn is_service_in_artifact(
    artifact: &String,
    service_name: &str,
    manifest_data: Option<&ApplicationManifestData>,
    docker_compose: Option<&DockerCompose>,
    runtime: Option<&Runtime>,
    pnpm_workspace: Option<&PnpmWorkspace>,
    package_json: Option<&ApplicationPackageJson>,
    program_text: Option<&String>,
    sdk_json: Option<&ProjectPackageJson>,
) -> Result<bool> {
    match artifact {
        "manifest" => {
            if let Some(manifest_data) = manifest_data {
                return is_service_in_manifest(manifest_data, service_name)?;
            } else {
                return Err(anyhow::anyhow!("Manifest data is required to proceed."))
            }
        }
        "docker_compose" => {
            if let Some(docker_compose) = docker_compose {
                return is_service_in_docker_compose(docker_compose, service_name)?;
            } else {
                return Err(anyhow::anyhow!("Docker compose data is required to proceed."))
            }
        }
        "runtime" => {
            if let Some(runtime) = runtime {
                match runtime {
                    Runtime::Bun => {
                        if let Some(package_json) = package_json {
                            return is_service_in_runtime_files(runtime, pnpm_workspace, package_json, service_name)?;
                        } else {
                            return Err(anyhow::anyhow!("Package json data is required to proceed."))
                        }
                    }
                    Runtime::Node => {
                        if let Some(pnpm_workspace) = pnpm_workspace {
                            return is_service_in_runtime_files(runtime, pnpm_workspace, package_json, service_name)?;
                        } else {
                            return Err(anyhow::anyhow!("Pnpm workspace data is required to proceed."))
                        }
                    }
                }
            }
        }
        // "universal_sdk" => {
        //     if let Some(sdk_json) = sdk_json {
        //         return is_service_in_universal_sdk(program_text, sdk_json, service_name)?;
        //     } else {
        //         return Err(anyhow::anyhow!("Sdk json data is required to proceed."))
        //     }
        // }
    }
    return Ok(false)
}


#[derive(Debug)]
pub(super) struct ServiceCommand;

impl ServiceCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ServiceCommand {
    fn command(&self) -> Command {
        command("service", "Sync a new service")
            .alias("svc")
            .alias("project")
            .alias("proj")
            .arg(
                Arg::new("name")
                .help("The name of the service"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The path to modules directory"),
            )
            .arg(
                Arg::new("add")
                    .short('a')
                    .long("add")
                    .help("Add a service to application artifacts")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("remove")
                    .short('r')
                    .long("remove")
                    .help("Remove a service from application artifacts")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("artifacts")
                    .short('f')
                    .long("artifacts")
                    .help("The artifacts to add the service to")
                    .value_parser(Artifact::VARIANTS)
                    .num_args(0..)
                    .action(ArgAction::Append),
            )
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use"),
                    .value_parser(Database::VARIANTS),
            )
            .arg(
                Arg::new("infrastructure")
                    .short('i')
                    .long("infrastructure")
                    .help("The infrastructure to use")
                    .value_parser(Infrastructure::VARIANTS)
                    .num_args(0..)
                    .action(ArgAction::Append),
            )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the service"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<(), DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        
        let mut rendered_templates = Vec::<RenderedTemplate>::new();
        let mut rendered_templates_cache = RenderedTemplatesCache::new();
        
        let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Project)?;
        
        let service_name = matches.get_one::<String>("name").unwrap();
        
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");
        let existing_manifest_data = from_str::<ApplicationManifestData>(
            &read_to_string(&manifest_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        let modules_path = Path::new(&existing_manifest_data.modules_path.clone());
        let runtime = existing_manifest_data.runtime.parse()?;
        let service_base_path = prompt_base_path(
            &app_root_path,
            &ManifestData::Application(&existing_manifest_data),
            &Some(service_name.clone()),
            &mut line_editor,
            stdout,
            matches,
            0,
        )?;

        let dir_project_names_set: HashSet<String> = HashSet::new(service_name);

        let docker_compose_path = app_root_path.join("docker-compose.yaml");
        let docker_compose = if docker_compose_path.exists() {
            Some(yaml_from_str::<DockerCompose>(
                &read_to_string(&docker_compose_path).with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?)
        } else {
            None
        };
        let application_package_json_path = app_root_path.join("package.json");
        let application_package_json = if application_package_json_path.exists() {
            Some(json_from_str::<ApplicationPackageJson>(
                &read_to_string(&application_package_json_path).with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?)
        } else {
            None
        };
        
        let service_package_json = if service_base_path.join("package.json").exists() {
            Some(json_from_str::<ProjectPackageJson>(
                &read_to_string(&service_base_path.join("package.json")).with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?)
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(stdout, "Service package.json not found in service directory. Generating it...")?;
            stdout.reset()?;
            let service_package_json_path = service_base_path.join("package.json");
            let service_package_json_template = generate_service_package_json(service_name, service_base_path)?;
            rendered_templates_cache.insert(service_package_json_path.to_string_lossy(), service_package_json_template);
            Some(service_package_json_template.content)
        };

        let pnpm_workspace_path = app_root_path.join("pnpm-workspace.yaml");
        let pnpm_workspace = if pnpm_workspace_path.exists() {
            Some(yaml_from_str::<PnpmWorkspace>(
                &read_to_string(&pnpm_workspace_path).with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?)
        } else {
            if existing_manifest_data.runtime == Runtime::Node {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                writeln!(stdout, "Pnpm workspace not found in application directory. This may indicate the app was not initialized properly. Please run `forklaunch init` to initialize the app.")?;
                stdout.reset()?;
                return Err(anyhow::anyhow!("Pnpm workspace not found in application directory. This may indicate the app was not initialized properly. Please run `forklaunch init` to initialize the app."))
            } else {
                None
            }
        };

        let (mut usdk_ast_program_text, mut usdk_json) = read_universal_sdk_content(&modules_path)?;
        

        let mode = if matches.get_flag("add") {
            ArtifactModification::Add
        } else if matches.get_flag("remove") {
            ArtifactModification::Remove
        } else {
            return Err(anyhow::anyhow!("Invalid mode. Please use --add or --remove."))
        };
        let artifacts = matches.get_many::<String>("artifacts");
        // TODO: Implement artifact handling
        // if "all" then sync all artifacts else sync only the specified artifacts
        if artifacts.is_some() {
            let artifacts = artifacts.unwrap();
            if artifacts.contains("all") {
                artifacts = ARTIFACTS.iter().cloned().map(|s| s.to_string()).filter(|s| s != "all").collect();
            }
        }
        let mut to_modify = Vec::<String>::new();
        for artifact in artifacts {
            let is_present = is_service_in_artifact(
                &artifact, 
                &service_name, 
                Some(&existing_manifest_data), 
                Some(&docker_compose), 
                Some(&runtime), 
                Some(&pnpm_workspace), 
                Some(&application_package_json), 
                Some(&usdk_ast_program_text), 
                Some(&usdk_json))?;
            match mode {
                ArtifactModification::Add => {
                    if !is_present {
                        to_modify.push(artifact);
                    }
                }
                ArtifactModification::Remove => {
                    if is_present {
                        to_modify.push(artifact);
                    }
                }
            }
        }
        if to_modify.is_empty() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "No artifacts to modify.")?;
            stdout.reset()?;
            return Ok(())
        }
        println!("sync:service:625 to_modify: {:?}", to_modify);
        println!("sync:service:626 Processing {} artifacts", to_modify.len());

        match mode {
            ArtifactModification::Add => {
                for artifact in to_modify {
                    println!("sync:service:631 Adding service to artifact: {:?}", artifact);
                    let results = add_package_to_artifact(
                        service_name, 
                        &existing_manifest_data,
                        &app_root_path,
                        &modules_path,
                        &artifact,
                        InitializeType::Service,
                        stdout,
                        matches,
                        Some(&docker_compose),
                        Some(&runtime),
                        Some(&pnpm_workspace),
                        Some(&application_package_json),
                        Some(&program_text),
                        Some(&sdk_json),
                        None,
                    )?;
                    for _artifact_name, result in results {
                        match artifact {
                            "manifest" => {
                                let new_manifest_data = result["manifest"].to_string();
                                rendered_templates.push(RenderedTemplate {
                                    path: manifest_path,
                                    content: new_manifest_data,
                                    context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
                                });
                            }
                            "docker_compose" => {
                                let new_docker_compose = result["docker_compose"].to_string();
                                rendered_templates.push(RenderedTemplate {
                                    path: docker_compose_path,
                                    content: new_docker_compose,
                                    context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
                                });
                            }
                            "runtime" => {
                                let pnpm_workspace = result["pnpm_workspace"].to_string();
                                let application_package_json = result["package_json"].to_string();
                                rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("package.json"),
                                    content: application_package_json,
                                    context: Some(ERROR_FAILED_TO_WRITE_PACKAGE_JSON.to_string()),
                                });
                                if let Some(pnpm_workspace) = pnpm_workspace {
                                    rendered_templates.push(RenderedTemplate {
                                        path: modules_path.join("pnpm-workspace.yaml"),
                                            content: pnpm_workspace,
                                            context: Some(ERROR_FAILED_TO_WRITE_PNPM_WORKSPACE.to_string()),
                                        });
                                }
                            }
                            "sdk" => {
                                rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("universal-sdk").join("universalSdk.ts"),
                                    content: results["sdk_ast_program_text"].to_string(),
                                    context: None,
                                });
                                rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("universal-sdk").join("package.json"),
                                    content: results["sdk_project_json"].to_string(),
                                    context: None,
                                });
                            }
                        }
                    }
                }
            }
            ArtifactModification::Remove => {
                for artifact in to_modify {
                    println!("sync:service:635 Removing service from artifact: {:?}", artifact);
                    let results = remove_package_from_artifact(
                        vec![service_name.clone()],
                        &mut existing_manifest_data,
                        Some(&mut docker_compose),
                        Some(&mut runtime),
                        Some(&mut pnpm_workspace),
                        Some(&mut application_package_json),
                        Some(&mut usdk_ast_program_text),
                        Some(&mut usdk_json),
                        &app_root_path,
                        &modules_path,
                        &artifact,
                    )?;
                    for _artifact_name, result in results {
                        match artifact {
                            "manifest" => {
                                rendered_templates.push(RenderedTemplate {
                                    path: manifest_path,
                                    content: result["manifest"].to_string(),
                                    context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
                                });
                            }
                            "docker_compose" => {
                                rendered_templates.push(RenderedTemplate {
                                    path: docker_compose_path,
                                    content: result["docker_compose"].to_string(),
                                    context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
                                });
                            }
                            "runtime" => {
                                rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("package.json"),
                                    content: result["package_json"].to_string(),
                                    context: Some(ERROR_FAILED_TO_WRITE_PACKAGE_JSON.to_string()),
                                });
                                if let Some(pnpm_workspace) = pnpm_workspace {
                                    rendered_templates.push(RenderedTemplate {
                                        path: modules_path.join("pnpm-workspace.yaml"),
                                        content: pnpm_workspace,
                                        context: Some(ERROR_FAILED_TO_WRITE_PNPM_WORKSPACE.to_string()),
                                    });
                                }
                            }
                            "universal-sdk" => {
                                rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("universal-sdk").join("universalSdk.ts"),
                                    content: result["sdk_ast_program_text"].to_string(),
                                    context: None,
                                });
                                rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("universal-sdk").join("package.json"),
                                    content: result["sdk_project_json"].to_string(),
                                    context: None,
                                });
                            }
                        }
                    }
                }
            }
        }

        for rendered_template in rendered_templates_cache {
            rendered_templates.push(rendered_template);
        }

        write_rendered_templates(&rendered_templates, false, &mut stdout)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "Successfully synced {} project(s)/package(s) from service artifacts", to_modify.len())?;
        stdout.reset()?;

        Ok(())
        
        
    }
}