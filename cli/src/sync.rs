use std::{fs::{self, read_to_string}, path::{Path}, io::{Write}, collections::HashSet};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use serde_yml::{from_str, to_string};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{
        ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_WRITE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE,
        ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
        ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
        ERROR_FAILED_TO_CREATE_PACKAGE_JSON,
        ERROR_FAILED_TO_READ_PNPM_WORKSPACE,
        ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE,
        Runtime, InitializeType,
    },
    core::{
        command::command,
        manifest::{
            ApplicationInitializationMetadata, InitializableManifestConfig,
            InitializableManifestConfigMetadata,
            application::ApplicationManifestData,
            remove_project_definition_from_manifest,
        },
        docker::{
            remove_service_from_docker_compose, remove_worker_from_docker_compose, DockerCompose,
        },
        base_path::{RequiredLocation, find_app_root_path},
        package_json::{application_package_json::ApplicationPackageJson, remove_project_definition_from_package_json},
        pnpm_workspace::{PnpmWorkspace, remove_project_definition_from_pnpm_workspace},
        rendered_template::{RenderedTemplate, write_rendered_templates},
        universal_sdk::{remove_project_vec_from_universal_sdk},
    },
    prompt::{prompt_for_confirmation, prompt_with_validation, ArrayCompleter},
};

#[derive(Debug)]
pub(crate) struct SyncCommand;

impl SyncCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

const DIRS_TO_IGNORE: &[&str] = &[
    "node_modules",
    "assets",
    "patches",
    ".git",
    ".github",
    ".vscode",
    "monitoring",
    "core",
    "universal-sdk",
];
const DOCKER_SERVICES_TO_IGNORE: &[&str] = &[
    "redis",
    "postgres",
    "mysql",
    "mariadb",
    "sqlite",
    "better-sqlite",
    "libsql",
    "mssql",
    "mongodb",
    "rabbitmq",
    "tempo",
    "loki",
    "prometheus",
    "grafana",
    "otel-collector",
    "redis",
    "postgresql",
    "mysql",
    "mariadb",
    "sqlite",
    "better-sqlite",
    "libsql",
    "mssql",
    "mongodb",
    "rabbitmq",
    "tempo",
    "loki",
    "prometheus",
    "grafana",
    "otel-collector",
];
const RUNTIME_PROJECTS_TO_IGNORE: &[&str] = &[
    "core",
    "monitoring",
    "universal-sdk",
];

/// Generic function to find directory names in any given path
/// 
/// # Arguments
/// * `path` - The path to search for directories
/// * `ignore_patterns` - Optional slice of directory names to ignore (if None, no directories are ignored)
/// 
/// # Returns
/// * `Result<Vec<String>>` - Vector of directory names found in the path
fn find_directory_names<P: AsRef<Path>>(
    path: P, 
    ignore_patterns: Option<&[&str]>
) -> Result<Vec<String>> {
    let path = path.as_ref();
    let mut directories = vec![];
    
    if !path.exists() {
        return Ok(directories);
    }
    
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            if let Some(dir_name) = entry.path().file_name() {
                let dir_name_str = dir_name.to_string_lossy().to_string();
                
                // Only ignore if ignore_patterns is Some and contains the directory name
                let should_ignore = ignore_patterns
                    .map(|patterns| patterns.contains(&dir_name_str.as_str()))
                    .unwrap_or(false);
                
                if !should_ignore {
                    directories.push(dir_name_str);
                }
            }
        }
    }
    
    Ok(directories)
}

/// Legacy function that maintains the original behavior for backward compatibility
fn find_project_dir_names(modules_path: &Path) -> Result<Vec<String>> {
    let directories = find_directory_names(modules_path, Some(DIRS_TO_IGNORE))?;
    println!("sync:121 project_dirs: {:?}", directories);
    Ok(directories)
}

fn find_file_names(path: &Path) -> Result<Vec<String>> {
    let files = fs::read_dir(path)?;
    let files = files.map(|file| file.unwrap().path().file_name().unwrap().to_string_lossy().to_string()).collect();
    Ok(files)
}

fn check_manifest(manifest_data: &ApplicationManifestData, dir_project_names: &Vec<String>) -> Result<(Vec<String>, Vec<String>)> {
    let manifest_project_names: HashSet<String> = manifest_data.projects
        .iter()
        .map(|project| project.name.clone())
        .collect();
    println!("sync:130 manifest_project_names: {:?}", manifest_project_names);
    let dir_project_names_set: HashSet<String> = dir_project_names
        .iter()
        .cloned()
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    let projects_to_remove: Vec<String> = manifest_project_names
        .difference(&dir_project_names_set)
        .cloned()
        .filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str()))
        .collect();
    println!("sync:141 projects_to_remove: {:?}", projects_to_remove);
    let projects_to_add: Vec<String> = dir_project_names_set
        .difference(&manifest_project_names)
        .cloned()
        .collect();
    println!("sync:146 projects_to_add: {:?}", projects_to_add);
    Ok((projects_to_remove, projects_to_add))
}

fn check_docker_compose(docker_compose: &DockerCompose, dir_project_names: &Vec<String>) -> Result<(Vec<String>, Vec<String>)> {
    let docker_services: Vec<String> = docker_compose.services
        .keys()
        .cloned()
        .filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str()))
        .collect();
    println!("sync:156 docker_services: {:?}", docker_services);
    let services_to_remove_docker: Vec<String> = docker_services
        .iter()
        .filter(|service| !dir_project_names.iter().any(|m| service.contains(m)))
        .cloned()
        .collect();
    println!("sync:162 services_to_remove_docker: {:?}", services_to_remove_docker);
    let services_to_add_docker: Vec<String> = dir_project_names
        .iter()
        .filter(|project| !docker_services.iter().any(|m| m.contains(project.as_str())))
        .cloned()
        .collect();
    println!("sync:168 services_to_add_docker: {:?}", services_to_add_docker);
    Ok((services_to_remove_docker, services_to_add_docker))
}

fn check_runtime_files(runtime: &Runtime, modules_path: &Path, dir_project_names: &Vec<String>) -> Result<(Vec<String>, Vec<String>)> {
    if *runtime == Runtime::Node {
        let pnpm_workspace_path = modules_path.join("pnpm-workspace.yaml");
            let full_pnpm_workspace: PnpmWorkspace = from_str(
                &read_to_string(pnpm_workspace_path)
                    .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?;
            let pnpm_workspace_projects: HashSet<String> = full_pnpm_workspace.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            let dir_project_names_set: HashSet<String> = dir_project_names.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
            let pnpm_workspace_projects_to_remove: Vec<String> = pnpm_workspace_projects
                .difference(&dir_project_names_set)
                .cloned()
                .collect();
            let pnpm_workspace_projects_to_add: Vec<String> = dir_project_names_set
                .difference(&pnpm_workspace_projects)
                .cloned()
                .collect();
            println!("sync:190 pnpm_workspace_projects: {:?}", pnpm_workspace_projects);
            println!("sync:191 pnpm_workspace_projects_to_remove: {:?}", pnpm_workspace_projects_to_remove);
            println!("sync:192 pnpm_workspace_projects_to_add: {:?}", pnpm_workspace_projects_to_add);
            Ok((pnpm_workspace_projects_to_remove, pnpm_workspace_projects_to_add))
    } else if *runtime == Runtime::Bun {
        let application_package_json_path = if modules_path.join("package.json").exists() {
                modules_path.join("package.json")
            } else {
                return Err(anyhow::anyhow!(
                    "package.json not found in {}",
                    modules_path.display()
                ));
            };
        let full_package_json: ApplicationPackageJson = from_str(
            &read_to_string(application_package_json_path)
                .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;
        let package_json_projects: HashSet<String> = full_package_json.workspaces.unwrap_or_default().iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
        let dir_project_names_set: HashSet<String> = dir_project_names.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
        println!("sync:210 package_json_projects: {:?}", package_json_projects);
        let package_json_projects_to_remove: Vec<String> = package_json_projects
            .difference(&dir_project_names_set)
            .cloned()
            .collect();
        let package_json_projects_to_add: Vec<String> = dir_project_names_set
            .difference(&package_json_projects)
            .cloned()
            .collect();
        println!("sync:219 package_json_projects_to_remove: {:?}", package_json_projects_to_remove);
        println!("sync:220 package_json_projects_to_add: {:?}", package_json_projects_to_add);
        Ok((package_json_projects_to_remove, package_json_projects_to_add))
    } else {
        Ok((Vec::new(), Vec::new()))
    }
}

fn prompt_sync_confirmation(
    matches: &ArgMatches,
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    message: &str,
) -> Result<bool> {
    let confirm_override = matches.get_flag("confirm");
    if !confirm_override {
        let continue_sync = prompt_for_confirmation(line_editor, message)?;
        if !continue_sync {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(stdout, "Sync cancelled")?;
            stdout.reset()?;
            return Ok(false);
        }
    }
    Ok(true)
}

fn init_service(service_name: &str, app_root_path: &Path, modules_path: &Path, manifest_data: &mut ApplicationManifestData, stdout: &mut StandardStream) -> Result<()> {
    let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
    let mut stdout = StandardStream::stdout(ColorChoice::Always);

    
    let service_base_path = modules_path.join(service_name);
    let service_directories = find_project_dir_names(&service_base_path)?;
    let service_files = find_file_names(&service_base_path)?;
    println!("sync:286 service_directories: {:?}", service_directories);
    println!("sync:287 service_files: {:?}", service_files);
    
    let service_manifest_data = ServiceManifestData::default();
    let service_manifest_data = service_manifest_data.initialize(
        InitializableManifestConfigMetadata::Project(ProjectInitializationMetadata {
            project_name: service_name.clone(),
        }),
    );

    let database = prompt_with_validation(
        &mut line_editor,
        &mut stdout,
        "database",
        matches,
        "database type",
        Some(&Database::VARIANTS),
        |input| Database::VARIANTS.contains(&input),
        |_| "Invalid database type. Please try again".to_string(),
    )?
    .parse()?;
     let description = prompt_without_validation(
        &mut line_editor,
        &mut stdout,
        "description",
        matches,
        "description",
        None,
    )?;
    let mut manifest_data: ServiceManifestData = ServiceManifestData {
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

    print("sync:379 Initialize service here...")
    // TODO: implement service initialization
    // let dryrun = False;
    // generate_basic_service(
    //     &service_name,
    //     &service_base_path,
    //     &app_root_path,
    //     &mut service_manifest_data,
    //     &mut stdout,
    //     dryrun,
    // )?;
    // if !dryrun {
    //     stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
    //     writeln!(stdout, "{} initialized successfully!", service_name)?;
    //     stdout.reset()?;
    //     format_code(&base_path, &manifest_data.runtime.parse()?);
    // }

    Ok(())
}

fn init_library(project_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}

fn init_worker(project_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}

fn init_module(project_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}

fn init_router(project_name: &str, modules_path: &Path, manifest_data: &mut ApplicationManifestData, stdout: &mut StandardStream) -> Result<()> {
    Ok(())
}

impl CliCommand for SyncCommand {
    fn command(&self) -> Command {
        command(
            "sync",
            "Sync manifest with application files",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path"),
        )
        .arg(
            Arg::new("confirm")
                .short('c')
                .long("confirm")
                .help("Flag to confirm any prompts")
                .action(ArgAction::SetTrue),
        )
        .arg(
            Arg::new("skip-prompt")
                .short('s')
                .long("skip-prompt")
                .help("Flag to skip any prompts")
                .action(ArgAction::SetTrue),
        )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        // check modules directories against manifest.toml, docker-compose.yml, pnpm-workspace.yaml, and application package.json
        // remove necessary projects from manifest.toml, update docker-compose.yml, pnpm-workspace.yaml, and package.json accordingly
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");
        
        // Read in manifest.toml
        let existing_manifest_data = toml::from_str::<ApplicationManifestData>(
            &fs::read_to_string(&manifest_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        
        let mut manifest_data = existing_manifest_data.initialize(
            InitializableManifestConfigMetadata::Application(ApplicationInitializationMetadata {
                app_name: existing_manifest_data.app_name.clone(),
                database: None,
            }),
        );

        let modules_path = app_root_path.join(Path::new(&existing_manifest_data
            .modules_path));
        println!("sync:291 modules_path: {:?}", modules_path);
        
        // Read in docker-compose.yaml
        let docker_compose_path = if app_root_path.join("docker-compose.yaml").exists() {
            app_root_path.join("docker-compose.yaml")
        } else {
            return Err(anyhow::anyhow!(
                "docker-compose.yaml not found in {}",
                app_root_path.display()
            ));
        };

        let mut docker_compose = from_str(
            &read_to_string(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;

        println!("sync:309 Here we begin the sync operations. Starting with manifest.toml");
        if modules_path.exists() {
            let mut rendered_templates = vec![];
            // project names in directories
            let dir_project_names = find_project_dir_names(&modules_path)?;
            let dir_project_names_set: HashSet<String> = dir_project_names.iter().cloned().collect();
            println!("sync:315 dir_project_names: {:?}", dir_project_names);
            println!("sync:316 dir_project_names_set: {:?}", dir_project_names_set);

            // projects to remove and add from manifest.toml
            let (manifest_projects_to_remove, manifest_projects_to_add) = check_manifest(&manifest_data, &dir_project_names)?;
            
            // projects to remove from docker-compose.yml
            let (services_to_remove_docker, services_to_add_docker) = check_docker_compose(&docker_compose, &dir_project_names)?;
            
            
            // remove projects from manifest.toml
            if !manifest_projects_to_remove.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in manifest that no longer exist in directories:", manifest_projects_to_remove.len())?;
                for project_name in &manifest_projects_to_remove {
                    writeln!(stdout, "  - {}", project_name)?;
                }
                stdout.reset()?;
                
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to remove these projects from manifest.toml? (y/N) ")?;
                
                // remove projects from manifest.toml
                if continue_sync {
                    for project_name in &manifest_projects_to_remove {
                        remove_project_definition_from_manifest(&mut manifest_data, &project_name)?;
                    }
                }
                let new_manifest_projects: HashSet<String> = manifest_data.projects.iter().map(|project| project.name.clone()).filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
                println!("sync:347 new_manifest_projects: {:?}", new_manifest_projects);
                if new_manifest_projects.difference(&dir_project_names_set).count() != 0 {
                    println!("sync:349 difference: {:?}", new_manifest_projects.difference(&dir_project_names_set));
                    return Err(anyhow::anyhow!("Some projects were not removed from manifest.toml"));
                } else {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "Successfully removed {} project(s) from manifest.toml", manifest_projects_to_remove.len())?;
                    stdout.reset()?;
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No projects to remove from manifest.toml")?;
                stdout.reset()?;
            }
            if !manifest_projects_to_add.is_empty() && !matches.get_flag("skip-prompt") {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in directories that are not in manifest:", manifest_projects_to_add.len())?;
                for project_name in &manifest_projects_to_add {
                    writeln!(stdout, "  - {}", project_name)?;
                }
                stdout.reset()?;
                // writeln!(stdout, "Please add these projects to the manifest.")?;
                // TODO: add projects to manifest.toml
                // read directory, create manifest data, add project to manifest.toml
                for project_name in &manifest_projects_to_add {
                    let Some(project_type) = prompt_with_validation(
                        &mut line_editor,
                        &mut stdout,
                        "type",
                        matches,
                        "project type",
                        Some(&InitializeType::VARIANTS),
                        |input| InitializeType::VARIANTS.contains(&input),
                        |_| "Invalid project type. Please try again".to_string(),
                    )?
                    .parse()?;
                    match project_type {
                        InitializeType::Service => {
                            init_service(project_name, &app_root_path, &modules_path, &manifest_data, &mut stdout)?;
                        }
                        InitializeType::Library => {
                            init_library(project_name, &modules_path, &manifest_data, &mut stdout)?;
                        }
                        InitializeType::Worker => {
                            init_worker(project_name, &modules_path, &manifest_data, &mut stdout)?;
                        }
                        InitializeType::Module => {
                            init_module(project_name, &modules_path, &manifest_data, &mut stdout)?;
                        }
                        InitializeType::Router => {
                            init_router(project_name, &modules_path, &manifest_data, &mut stdout)?;
                        }
                    }
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No projects to add to manifest.toml")?;
                stdout.reset()?;
            }
            
            // write manifest.toml
            let manifest_content = toml::to_string_pretty(&manifest_data)
                .with_context(|| ERROR_FAILED_TO_WRITE_MANIFEST)?;
            rendered_templates.push(
                RenderedTemplate {
                    path: manifest_path,
                    content: manifest_content,
                    context: Some(ERROR_FAILED_TO_WRITE_MANIFEST.to_string()),
                },
            );

            
            // remove projects from docker-compose.yaml
            if !services_to_remove_docker.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} service(s) in docker-compose.yaml that no longer exist in directories:", services_to_remove_docker.len())?;
                for service in &services_to_remove_docker {
                    writeln!(stdout, "  - {}", service)?;
                }
                stdout.reset()?;
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to remove these services from docker-compose.yaml? (y/N) ")?;
                if continue_sync {
                    for service in &services_to_remove_docker {
                        remove_service_from_docker_compose(&mut docker_compose, &service)?;
                        remove_worker_from_docker_compose(&mut docker_compose, &service)?;
                    }
                }
                let new_docker_services: HashSet<String> = docker_compose.services.keys().cloned().filter(|service| !DOCKER_SERVICES_TO_IGNORE.contains(&service.as_str())).collect();
                println!("sync:409 new_docker_services: {:?}", new_docker_services);
                if new_docker_services.difference(&dir_project_names_set).count() != 0 {
                    println!("sync:411 difference: {:?}", new_docker_services.difference(&dir_project_names_set));
                    return Err(anyhow::anyhow!("Some services were not removed from docker-compose.yaml"));
                } else {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "Successfully removed {} service(s) from docker-compose.yaml", services_to_remove_docker.len())?;
                    stdout.reset()?;
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No services to remove from docker-compose.yaml")?;
                stdout.reset()?;
            }
            if !services_to_add_docker.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} service(s) in directories that are not in docker-compose.yaml:", services_to_add_docker.len())?;
                for service in &services_to_add_docker {
                    writeln!(stdout, "  - {}", service)?;
                }
                stdout.reset()?;
                writeln!(stdout, "Please add these services to docker-compose.yaml")?;
                // TODO: add services to docker-compose.yml
                // read directory, create ServiceManifestData, add service to docker-compose.yml
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No services to add to docker-compose.yaml")?;
                stdout.reset()?;
            }

            rendered_templates.push(
                RenderedTemplate {
                    path: docker_compose_path,
                    content: to_string(&docker_compose)?,
                    context: Some(ERROR_FAILED_TO_WRITE_DOCKER_COMPOSE.to_string()),
                },
            );
            // projects to remove from pnpm-workspace.yaml and package.json
            let (runtime_projects_to_remove, runtime_projects_to_add) = check_runtime_files(&manifest_data.runtime.parse::<Runtime>()?, &modules_path, &dir_project_names)?;
            println!("sync:448 runtime_projects_to_remove: {:?}", runtime_projects_to_remove);
            println!("sync:449 runtime_projects_to_add: {:?}", runtime_projects_to_add);
            // remove projects from pnpm-workspace.yaml and package.json
            match manifest_data.runtime.parse::<Runtime>()? {
                Runtime::Node => {
                    if !runtime_projects_to_remove.is_empty() {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in pnpm-workspace.yaml that no longer exist in directories:", runtime_projects_to_remove.len())?;
                        for package in &runtime_projects_to_remove {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        stdout.reset()?;
                        let continue_sync = prompt_sync_confirmation(
                            matches, 
                            &mut line_editor, 
                            &mut stdout, 
                            "Do you want to remove these packages from pnpm-workspace.yaml? (y/N) ")?;
                        if continue_sync {
                            let pnpm_workspace_path = modules_path.join("pnpm-workspace.yaml");
                            let mut pnpm_workspace: PnpmWorkspace = from_str(&read_to_string(&pnpm_workspace_path)?)?;
                            println!("sync:468 pnpm_workspace: {:?}", pnpm_workspace);
                            for package in &runtime_projects_to_remove {
                                println!("sync:470 package: {:?}", package);
                                pnpm_workspace = remove_project_definition_from_pnpm_workspace(
                                        &mut pnpm_workspace,
                                        &package,
                                    )?;
                                println!("sync:475 content: {:?}", pnpm_workspace);
                            }
                            println!("sync:477 content: {:?}", pnpm_workspace);
                            rendered_templates.push(RenderedTemplate {
                                    path: modules_path.join("pnpm-workspace.yaml"),
                                    content: to_string(&pnpm_workspace)?,
                                    context: Some(ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE.to_string()),
                                });
                            let new_pnpm_workspace_projects: HashSet<String> = pnpm_workspace.packages.iter().cloned().filter(|project| !RUNTIME_PROJECTS_TO_IGNORE.contains(&project.as_str())).collect();
                            println!("sync:484 new_pnpm_workspace_projects: {:?}", new_pnpm_workspace_projects);
                            if new_pnpm_workspace_projects.difference(&dir_project_names_set).count() != 0 {
                                println!("sync:486 difference: {:?}", new_pnpm_workspace_projects.difference(&dir_project_names_set));
                                return Err(anyhow::anyhow!("Some packages were not removed from pnpm-workspace.yaml"));
                            } else {
                                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                                writeln!(stdout, "Successfully removed {} package(s) from pnpm-workspace.yaml", runtime_projects_to_remove.len())?;
                                stdout.reset()?;
                            }
                        }  
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to remove from pnpm-workspace.yaml")?;
                        stdout.reset()?;
                    }
                    if !runtime_projects_to_add.is_empty() {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in directories that are not in pnpm-workspace.yaml:", runtime_projects_to_add.len())?;
                        for package in &runtime_projects_to_add {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        writeln!(stdout, "Please add these packages to pnpm-workspace.yaml")?;
                        stdout.reset()?;
                        // TODO: add packages to pnpm-workspace.yml
                        // read directory, create PnpmWorkspace, add package to pnpm-workspace.yml
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to add to pnpm-workspace.yaml")?;
                        stdout.reset()?;
                    }
                    
                }
                Runtime::Bun => {
                    if !runtime_projects_to_remove.is_empty() {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in package.json that no longer exist in directories:", runtime_projects_to_remove.len())?;
                        for package in &runtime_projects_to_remove {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        stdout.reset()?;
                        let continue_sync = prompt_sync_confirmation(
                            matches, 
                            &mut line_editor, 
                            &mut stdout, 
                            "Do you want to remove these packages from package.json? (y/N) ")?;
                        if continue_sync {
                            let package_json_path = modules_path.join("package.json");
                            let mut package_json: ApplicationPackageJson = from_str(&read_to_string(&package_json_path)?)?;
                            println!("sync:533 package_json: {:?}", package_json);
                            for package in &runtime_projects_to_remove {
                                package_json = remove_project_definition_from_package_json(
                                    &mut package_json,
                                    &package,
                                )?;
                                println!("sync:539 package_json: {:?}", package_json);
                            }
                            rendered_templates.push(RenderedTemplate {
                                path: modules_path.join("package.json"),
                                content: to_string(&package_json)?,
                                context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
                                });
                            let new_package_json_projects: HashSet<String> = package_json.workspaces.as_ref().unwrap().iter().cloned().filter(|project| !DIRS_TO_IGNORE.contains(&project.as_str())).collect();
                            println!("sync:547 new_package_json_projects: {:?}", new_package_json_projects);
                            if new_package_json_projects.difference(&dir_project_names_set).count() != 0 {
                                println!("sync:549 difference: {:?}", new_package_json_projects.difference(&dir_project_names_set));
                                return Err(anyhow::anyhow!("Some packages were not removed from package.json"));
                            } else {
                                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                                writeln!(stdout, "Successfully removed {} package(s) from package.json", runtime_projects_to_remove.len())?;
                                stdout.reset()?;
                            }
                        }
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to remove from package.json")?;
                        stdout.reset()?;
                    }
                    if !runtime_projects_to_add.is_empty() {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                        writeln!(stdout, "Found {} package(s) in directories that are not in package.json:", runtime_projects_to_add.len())?;
                        for package in &runtime_projects_to_add {
                            writeln!(stdout, "  - {}", package)?;
                        }
                        writeln!(stdout, "Please add these packages to package.json")?;
                        stdout.reset()?;
                        // TODO: add packages to package.json
                        // read directory, create ApplicationPackageJson, add package to package.json
                    } else {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                        writeln!(stdout, "No packages to add to package.json")?;
                        stdout.reset()?;
                    }
                }
            }
            println!("sync:580 removing projects from universal SDK");
            if !runtime_projects_to_remove.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} project(s) in directories that are in universal SDK that no longer exist:", runtime_projects_to_remove.len())?;
                for project in &runtime_projects_to_remove {
                    writeln!(stdout, "  - {}", project)?;
                }
                stdout.reset()?;
                let continue_sync = prompt_sync_confirmation(
                    matches, 
                    &mut line_editor, 
                    &mut stdout, 
                    "Do you want to remove these projects from universal SDK? (y/N) ")?;
                if continue_sync {
                    println!("sync:593 app_name: {:?}", manifest_data.app_name);
                    remove_project_vec_from_universal_sdk(
                        &mut rendered_templates,
                        &modules_path,
                        &manifest_data.app_name,
                        &runtime_projects_to_remove,
                    )?;
                }
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No projects to remove from universal SDK")?;
                stdout.reset()?;
            }
            if !runtime_projects_to_add.is_empty() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "Found {} package(s) in directories that are not in universal SDK:", runtime_projects_to_add.len())?;
                for package in &runtime_projects_to_add {
                    writeln!(stdout, "  - {}", package)?;
                }
                writeln!(stdout, "Please add these packages to universal SDK")?;
                stdout.reset()?;
                // TODO: Add packages to universal SDK
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "No packages to add to universal SDK")?;
                stdout.reset()?;
            }
            

            write_rendered_templates(&rendered_templates, false, &mut stdout)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "Successfully removed {} project(s)/package(s) from manifest, docker-compose.yml, and runtime files", manifest_projects_to_remove.len() + services_to_remove_docker.len() + runtime_projects_to_remove.len())?;
            stdout.reset()?;
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "No modules path configured in manifest")?;
            stdout.reset()?;
        }
        

        Ok(())
    }
}
}