use std::{io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use dialoguer::{theme::ColorfulTheme, MultiSelect};
use rustyline::{history::DefaultHistory, Editor};
use serde_json::from_str;
use termcolor::{ColorChoice, StandardStream};

use super::router::change_name as change_router_name;
use crate::{
    constants::{
        Database, WorkerBackend, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        ast::transformations::transform_registrations_worker_backend_ts::transform_registrations_worker_backend,
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        database::{get_database_port, is_in_memory_database},
        docker::{
            add_database_to_docker_compose, add_kafka_to_docker_compose,
            add_redis_to_docker_compose, clean_up_unused_infrastructure_services, DockerCompose,
        },
        env::Env,
        manifest::{worker::WorkerManifestData, ManifestData},
        package_json::{
            package_json_constants::{
                WORKER_BULLMQ_VERSION, WORKER_DATABASE_VERSION, WORKER_KAFKA_VERSION,
                WORKER_REDIS_VERSION,
            },
            project_package_json::ProjectPackageJson,
        },
        removal_template::{remove_template_files, RemovalTemplate},
        rendered_template::{write_rendered_templates, RenderedTemplate, RenderedTemplatesCache},
    },
    prompt::{prompt_field_from_selections_with_validation, ArrayCompleter},
    CliCommand,
};

#[derive(Debug)]
pub(super) struct WorkerCommand;

impl WorkerCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

fn change_name(
    base_path: &Path,
    name: &str,
    manifest_data: &mut WorkerManifestData,
    project_package_json: &mut ProjectPackageJson,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Vec<RemovalTemplate>> {
    let existing_name = base_path.file_name().unwrap().to_string_lossy().to_string();

    let mut removal_templates = vec![];

    manifest_data.worker_name = name.to_string();
    let project_entry = manifest_data
        .projects
        .iter_mut()
        .find(|project| project.name == existing_name)
        .unwrap();
    project_entry.name = name.to_string();

    project_package_json.name = Some(format!("@{}/{}", manifest_data.app_name, name.to_string()));

    removal_templates.extend(change_router_name(
        base_path,
        &existing_name,
        name,
        project_entry,
        rendered_templates_cache,
    )?);

    Ok(removal_templates)
}

fn change_description(
    description: &str,
    manifest_data: &mut WorkerManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    manifest_data.description = description.to_string();
    project_package_json.description = Some(description.to_string());

    Ok(())
}

fn change_backend(
    base_path: &Path,
    backend: &WorkerBackend,
    database: Option<Database>,
    manifest_data: &mut WorkerManifestData,
    project_package_json: &mut ProjectPackageJson,
    docker_compose_data: &mut DockerCompose,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<()> {
    let existing_backend = manifest_data.worker_type.parse::<WorkerBackend>()?;

    let project_entry = manifest_data
        .projects
        .iter_mut()
        .find(|project| project.name == manifest_data.worker_name);

    let template = rendered_templates_cache
        .get(base_path.join("registrations.ts"))?
        .unwrap();

    rendered_templates_cache.insert(
        base_path.join("registrations.ts").to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("registrations.ts").into(),
            content: transform_registrations_worker_backend(
                base_path,
                &existing_backend,
                backend,
                Some(template.content),
            )?,
            context: None,
        },
    );

    let dependencies = project_package_json.dependencies.as_mut().unwrap();
    dependencies.forklaunch_implementation_worker_bullmq = None;
    dependencies.forklaunch_implementation_worker_database = None;
    dependencies.forklaunch_implementation_worker_redis = None;
    dependencies.forklaunch_implementation_worker_kafka = None;

    let mut environment = docker_compose_data
        .services
        .get_mut(&manifest_data.worker_name)
        .unwrap()
        .environment
        .as_ref()
        .unwrap()
        .clone();

    let env_local_path = base_path.join(".env.local");
    let mut env_local_content: Env = serde_envfile::from_str(
        &rendered_templates_cache
            .get(&env_local_path)?
            .unwrap()
            .content,
    )?;

    env_local_content.db_name = None;
    env_local_content.db_host = None;
    env_local_content.db_user = None;
    env_local_content.db_password = None;
    env_local_content.db_port = None;
    env_local_content.redis_url = None;
    env_local_content.kafka_brokers = None;
    env_local_content.kafka_client_id = None;
    env_local_content.kafka_group_id = None;

    match backend {
        WorkerBackend::BullMQCache => {
            dependencies.forklaunch_implementation_worker_bullmq =
                Some(WORKER_BULLMQ_VERSION.to_string());
            project_entry.unwrap().resources.as_mut().unwrap().cache =
                Some(WorkerBackend::RedisCache.to_string());
            let _ = add_redis_to_docker_compose(
                &manifest_data.app_name,
                docker_compose_data,
                &mut environment,
            );
            env_local_content.redis_url = Some("redis://localhost:6379".to_string());
        }
        WorkerBackend::Database => {
            let db = database.unwrap();
            dependencies.forklaunch_implementation_worker_database =
                Some(WORKER_DATABASE_VERSION.to_string());
            project_entry.unwrap().resources.as_mut().unwrap().database =
                Some(Database::PostgreSQL.to_string());
            manifest_data.database = Some(database.unwrap().to_string());
            let _ = add_database_to_docker_compose(
                &ManifestData::Worker(&manifest_data),
                docker_compose_data,
                &mut environment,
            );
            env_local_content.db_name = Some(format!(
                "{}-{}-dev",
                manifest_data.app_name, manifest_data.worker_name
            ));
            if is_in_memory_database(&db) {
                env_local_content.db_host = Some("localhost".to_string());
                env_local_content.db_user = Some(format!("{}", db.to_string()));
                env_local_content.db_password = Some(format!("{}", db.to_string()));
                if let Some(port) = get_database_port(&db) {
                    env_local_content.db_port = Some(format!("{}", port));
                }
            }
        }
        WorkerBackend::RedisCache => {
            dependencies.forklaunch_implementation_worker_redis =
                Some(WORKER_REDIS_VERSION.to_string());
            project_entry.unwrap().resources.as_mut().unwrap().cache =
                Some(WorkerBackend::RedisCache.to_string());
            let _ = add_redis_to_docker_compose(
                &manifest_data.app_name,
                docker_compose_data,
                &mut environment,
            );
            env_local_content.redis_url = Some("redis://localhost:6379".to_string());
        }
        WorkerBackend::Kafka => {
            dependencies.forklaunch_implementation_worker_kafka =
                Some(WORKER_KAFKA_VERSION.to_string());
            project_entry.unwrap().resources.as_mut().unwrap().queue =
                Some(WorkerBackend::Kafka.to_string());
            let _ = add_kafka_to_docker_compose(
                &manifest_data.app_name,
                &manifest_data.worker_name,
                docker_compose_data,
                &mut environment,
            );
            env_local_content.kafka_brokers = Some("localhost:9092".to_string());
            env_local_content.kafka_client_id = Some(format!(
                "{}-{}-client",
                manifest_data.app_name, manifest_data.worker_name
            ));
            env_local_content.kafka_group_id = Some(format!(
                "{}-{}-group",
                manifest_data.app_name, manifest_data.worker_name
            ));
        }
    }

    rendered_templates_cache.insert(
        env_local_path.clone().to_string_lossy(),
        RenderedTemplate {
            path: env_local_path,
            content: serde_envfile::to_string(&env_local_content)?,
            context: None,
        },
    );

    docker_compose_data
        .services
        .get_mut(&manifest_data.worker_name)
        .unwrap()
        .environment = Some(environment);

    let _ = clean_up_unused_infrastructure_services(
        docker_compose_data,
        manifest_data.projects.clone(),
    );

    Ok(())
}

impl CliCommand for WorkerCommand {
    fn command(&self) -> Command {
        command("worker", "Change a forklaunch worker")
            .alias("wrk")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The service path"),
            )
            .arg(Arg::new("name").short('N').help("The name of the service"))
            .arg(
                Arg::new("backend")
                    .short('b')
                    .long("backend")
                    .help("The backend to use"),
            )
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use"),
            )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the service"),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let mut rendered_templates_cache = RenderedTemplatesCache::new();

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Worker,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data: WorkerManifestData = toml::from_str(
            &rendered_templates_cache
                .get(&config_path)
                .with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?
                .unwrap()
                .content,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        manifest_data.worker_name = base_path.file_name().unwrap().to_string_lossy().to_string();

        let name = matches.get_one::<String>("name");
        let backend = matches.get_one::<String>("backend");
        let database = matches.get_one::<String>("database");
        let description = matches.get_one::<String>("description");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if !matches.args_present() {
            let options = vec!["name", "backend", "description"];

            let selections = MultiSelect::with_theme(&ColorfulTheme::default())
                .with_prompt("What would you like to change?")
                .items(&options)
                .interact()?;

            if selections.is_empty() {
                writeln!(stdout, "No changes selected")?;
                return Ok(());
            }

            selections.iter().map(|i| options[*i]).collect()
        } else {
            vec![]
        };

        let name = prompt_field_from_selections_with_validation(
            "name",
            name,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter worker name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
                    && !input
                        .chars()
                        .any(|c| !c.is_ascii_alphanumeric() && c != '_' && c != '-')
            },
            |_| "Worker name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let backend = prompt_field_from_selections_with_validation(
            "backend",
            backend,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter backend: ",
            Some(&WorkerBackend::VARIANTS),
            |_input: &str| true,
            |_| "Invalid backend. Please try again".to_string(),
        )?;

        let database = if backend
            .clone()
            .is_some_and(|backend| backend.parse().ok() == Some(WorkerBackend::Database))
        {
            prompt_field_from_selections_with_validation(
                "database",
                database,
                &selected_options,
                &mut line_editor,
                &mut stdout,
                matches,
                "Enter database: ",
                Some(&Database::VARIANTS),
                |_input: &str| true,
                |_| "Invalid database. Please try again".to_string(),
            )?
            .and_then(|database| database.parse().ok())
        } else {
            None
        };

        let description = prompt_field_from_selections_with_validation(
            "description",
            description,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter project description (optional): ",
            None,
            |_input: &str| true,
            |_| "Invalid description. Please try again".to_string(),
        )?;

        let mut removal_templates = vec![];

        let project_package_json_path = base_path.join("package.json");
        let project_package_json_data = rendered_templates_cache
            .get(&project_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut project_json_to_write =
            serde_json::from_str::<ProjectPackageJson>(&project_package_json_data)?;

        let docker_compose_path = base_path.parent().unwrap().join("docker-compose.yaml");
        let mut docker_compose_data = from_str::<DockerCompose>(
            &rendered_templates_cache
                .get(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?
                .unwrap()
                .content,
        )?;

        if let Some(name) = name {
            removal_templates.extend(change_name(
                &base_path,
                &name,
                &mut manifest_data,
                &mut project_json_to_write,
                &mut rendered_templates_cache,
            )?);
        }
        if let Some(backend) = backend {
            change_backend(
                &base_path,
                &backend.parse()?,
                database,
                &mut manifest_data,
                &mut project_json_to_write,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
            )?
        }
        if let Some(description) = description {
            change_description(&description, &mut manifest_data, &mut project_json_to_write)?;
        }

        rendered_templates_cache.insert(
            config_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            docker_compose_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: docker_compose_path.into(),
                content: serde_yml::to_string(&docker_compose_data)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            project_package_json_path
                .clone()
                .to_string_lossy()
                .to_string(),
            RenderedTemplate {
                path: project_package_json_path.into(),
                content: serde_json::to_string_pretty(&project_json_to_write)?,
                context: None,
            },
        );

        let rendered_templates: Vec<RenderedTemplate> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;
        remove_template_files(&removal_templates, dryrun, &mut stdout)?;

        Ok(())
    }
}
