use std::{io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use convert_case::{Case, Casing};
use dialoguer::{MultiSelect, theme::ColorfulTheme};
use ramhorns::Template;
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use super::core::{
    change_database::{
        change_database_base_entity, change_database_env_variables,
        change_database_postinstall_script,
    },
    change_description::change_description as change_description_core,
    change_name::change_name as change_name_core,
};
use crate::{
    CliCommand,
    constants::{
        Database, ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
        ERROR_FAILED_TO_READ_MANIFEST, ERROR_FAILED_TO_READ_PACKAGE_JSON, WorkerType,
    },
    core::{
        ast::transformations::{
            transform_bootstrapper_ts::transform_bootstrapper_ts_database_dependency_injection,
            transform_mikroorm_config_ts::transform_mikroorm_config_ts,
            transform_registrations_ts::transform_registrations_ts_worker_type,
        },
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        database::{get_database_variants, get_db_driver, is_in_memory_database},
        docker::{
            DockerCompose, add_database_to_docker_compose, add_kafka_to_docker_compose,
            add_redis_to_docker_compose, clean_up_unused_infrastructure_services,
        },
        env::Env,
        format::format_code,
        manifest::{
            InitializableManifestConfig, InitializableManifestConfigMetadata, ManifestData,
            MutableManifestData, ProjectInitializationMetadata, worker::WorkerManifestData,
        },
        move_template::{MoveTemplate, move_template_files},
        name::validate_name,
        package_json::{
            application_package_json::ApplicationPackageJson,
            package_json_constants::{
                BULLMQ_VERSION, MIKRO_ORM_CORE_VERSION, MIKRO_ORM_DATABASE_VERSION,
                MIKRO_ORM_MIGRATIONS_VERSION, MIKRO_ORM_REFLECTION_VERSION, WORKER_BULLMQ_VERSION,
                WORKER_DATABASE_VERSION, WORKER_KAFKA_VERSION, WORKER_REDIS_VERSION,
            },
            project_package_json::ProjectPackageJson,
        },
        removal_template::{RemovalTemplate, remove_template_files},
        rendered_template::{
            RenderedTemplate, RenderedTemplatesCache, TEMPLATES_DIR, write_rendered_templates,
        },
    },
    prompt::{ArrayCompleter, prompt_field_from_selections_with_validation},
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
    docker_compose: &mut DockerCompose,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    removal_templates: &mut Vec<RemovalTemplate>,
) -> Result<MoveTemplate> {
    change_name_core(
        base_path,
        name,
        MutableManifestData::Worker(manifest_data),
        project_package_json,
        Some(docker_compose),
        rendered_templates_cache,
        removal_templates,
    )
}

fn change_description(
    description: &str,
    manifest_data: &mut WorkerManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    change_description_core(
        description,
        MutableManifestData::Worker(manifest_data),
        project_package_json,
    )
}

fn change_type(
    base_path: &Path,
    r#type: &WorkerType,
    database: Option<Database>,
    manifest_data: &mut WorkerManifestData,
    application_package_json: &mut ApplicationPackageJson,
    project_package_json: &mut ProjectPackageJson,
    docker_compose_data: &mut DockerCompose,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    removal_templates: &mut Vec<RemovalTemplate>,
) -> Result<()> {
    let project_entry = manifest_data
        .projects
        .iter_mut()
        .find(|project| project.name == manifest_data.worker_name)
        .unwrap();

    let existing_type = manifest_data.worker_type.parse::<WorkerType>()?;

    let existing_database = manifest_data
        .database
        .as_ref()
        .map(|db| db.parse::<Database>().unwrap());

    project_entry.metadata.as_mut().unwrap().r#type = Some(r#type.to_string());
    let resources = project_entry.resources.as_mut().unwrap();

    resources.database = None;
    resources.cache = None;
    resources.queue = None;

    let template = rendered_templates_cache
        .get(base_path.join("registrations.ts"))?
        .unwrap();

    rendered_templates_cache.insert(
        base_path.join("registrations.ts").to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("registrations.ts").into(),
            content: transform_registrations_ts_worker_type(
                base_path,
                &manifest_data.app_name,
                &manifest_data.worker_name.to_case(Case::Pascal),
                &existing_type,
                r#type,
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
        .get_mut(&format!("{}-worker", &manifest_data.worker_name))
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

    match r#type {
        WorkerType::BullMQCache => {
            dependencies.bullmq = Some(BULLMQ_VERSION.to_string());
            dependencies.forklaunch_implementation_worker_bullmq =
                Some(WORKER_BULLMQ_VERSION.to_string());
            resources.cache = Some(WorkerType::RedisCache.to_string());
            let _ = add_redis_to_docker_compose(
                &manifest_data.app_name,
                docker_compose_data,
                &mut environment,
            );
            env_local_content.redis_url = Some("redis://localhost:6379".to_string());
        }
        WorkerType::Database => {
            let db = database.unwrap();

            dependencies.database = Some(db.to_string());
            dependencies.mikro_orm_core = Some(MIKRO_ORM_CORE_VERSION.to_string());
            dependencies.mikro_orm_migrations = Some(MIKRO_ORM_MIGRATIONS_VERSION.to_string());
            dependencies.mikro_orm_reflection = Some(MIKRO_ORM_REFLECTION_VERSION.to_string());
            dependencies.mikro_orm_database = Some(MIKRO_ORM_DATABASE_VERSION.to_string());
            dependencies.forklaunch_implementation_worker_database =
                Some(WORKER_DATABASE_VERSION.to_string());

            resources.database = Some(db.to_string());

            manifest_data.database = Some(database.unwrap().to_string());
            manifest_data.db_driver = Some(get_db_driver(&db));
            manifest_data.is_mongo = db == Database::MongoDB;
            manifest_data.is_in_memory_database = is_in_memory_database(&db);

            let _ = add_database_to_docker_compose(
                &ManifestData::Worker(&manifest_data),
                docker_compose_data,
                &mut environment,
            );

            if let Some(existing_database) = existing_database {
                let removal_template = change_database_base_entity(
                    base_path,
                    &db,
                    &existing_database,
                    manifest_data.projects.clone(),
                    &manifest_data.app_name,
                    rendered_templates_cache,
                )?;

                if let Some(removal_template) = removal_template {
                    removal_templates.push(removal_template);
                }
            } else {
                let database_entity = match db {
                    Database::MongoDB => "nosql.base.entity.ts",
                    _ => "sql.base.entity.ts",
                };
                let entity_template_path = TEMPLATES_DIR
                    .get_file(
                        Path::new("project")
                            .join("core")
                            .join("persistence")
                            .join(database_entity),
                    )
                    .unwrap();
                let base_entity_ts_content =
                    Template::new(entity_template_path.contents_utf8().unwrap())?
                        .render(&manifest_data.clone());
                rendered_templates_cache.insert(
                    database_entity,
                    RenderedTemplate {
                        path: base_path
                            .parent()
                            .unwrap()
                            .join("core")
                            .join("persistence")
                            .join(database_entity),
                        content: base_entity_ts_content,
                        context: None,
                    },
                );
            }

            change_database_env_variables(
                &mut env_local_content,
                &manifest_data.app_name,
                &manifest_data.worker_name,
                &db,
            );

            change_database_postinstall_script(application_package_json, &db);

            rendered_templates_cache.insert(
                base_path.join("mikro-orm.config.ts").to_string_lossy(),
                RenderedTemplate {
                    path: base_path.join("mikro-orm.config.ts").into(),
                    content: if !base_path.join("mikro-orm.config.ts").exists() {
                        Template::new(
                            TEMPLATES_DIR
                                .get_file(
                                    Path::new("project")
                                        .join("worker")
                                        .join("mikro-orm.config.ts"),
                                )
                                .unwrap()
                                .contents_utf8()
                                .unwrap(),
                        )?
                        .render(&manifest_data.clone())
                    } else {
                        transform_mikroorm_config_ts(base_path, &existing_database, &db)?
                    },
                    context: None,
                },
            );

            rendered_templates_cache.insert(
                base_path.join("bootstrapper.ts").to_string_lossy(),
                RenderedTemplate {
                    path: base_path.join("bootstrapper.ts").into(),
                    content: transform_bootstrapper_ts_database_dependency_injection(base_path)?,
                    context: None,
                },
            );
        }
        WorkerType::RedisCache => {
            dependencies.forklaunch_implementation_worker_redis =
                Some(WORKER_REDIS_VERSION.to_string());
            resources.cache = Some(WorkerType::RedisCache.to_string());
            let _ = add_redis_to_docker_compose(
                &manifest_data.app_name,
                docker_compose_data,
                &mut environment,
            );
            env_local_content.redis_url = Some("redis://localhost:6379".to_string());
        }
        WorkerType::Kafka => {
            dependencies.forklaunch_implementation_worker_kafka =
                Some(WORKER_KAFKA_VERSION.to_string());
            resources.queue = Some(WorkerType::Kafka.to_string());
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
        .get_mut(&format!("{}-worker", &manifest_data.worker_name))
        .unwrap()
        .environment = Some(environment.clone());

    docker_compose_data
        .services
        .get_mut(&format!("{}-server", &manifest_data.worker_name))
        .unwrap()
        .environment = Some(environment.clone());

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
                Arg::new("type")
                    .short('b')
                    .long("type")
                    .help("The type to use"),
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
            &BasePathType::Change,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path
            .parent()
            .unwrap()
            .join(".forklaunch")
            .join("manifest.toml");

        let mut manifest_data: WorkerManifestData = toml::from_str::<WorkerManifestData>(
            &rendered_templates_cache
                .get(&config_path)
                .with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?
                .unwrap()
                .content,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        .initialize(InitializableManifestConfigMetadata::Project(
            ProjectInitializationMetadata {
                project_name: base_path.file_name().unwrap().to_string_lossy().to_string(),
            },
        ));

        let runtime = manifest_data.runtime.parse()?;

        let name = matches.get_one::<String>("name");
        let r#type = matches.get_one::<String>("type");
        let database = matches.get_one::<String>("database");
        let description = matches.get_one::<String>("description");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if matches.ids().all(|id| id == "dryrun") {
            let options = vec!["name", "type", "description"];

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
            "worker name",
            None,
            |input: &str| validate_name(input),
            |_| "Worker name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let r#type = prompt_field_from_selections_with_validation(
            "type",
            r#type,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "type",
            Some(&WorkerType::VARIANTS),
            |_input: &str| true,
            |_| "Invalid type. Please try again".to_string(),
        )?;

        let database = if r#type
            .clone()
            .map(|r#type| r#type.parse::<WorkerType>().unwrap() == WorkerType::Database)
            .unwrap_or(false)
        {
            let database_variants = get_database_variants(&runtime);
            prompt_field_from_selections_with_validation(
                "database",
                database,
                &["database"],
                &mut line_editor,
                &mut stdout,
                matches,
                "database",
                Some(database_variants),
                |input: &str| database_variants.contains(&input),
                |_| "Invalid database. Please try again".to_string(),
            )?
            .and_then(|database| database.parse::<Database>().ok())
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
            "project description (optional)",
            None,
            |_input: &str| true,
            |_| "Invalid description. Please try again".to_string(),
        )?;

        let mut removal_templates = vec![];
        let mut move_templates = vec![];

        let application_package_json_path = base_path.parent().unwrap().join("package.json");
        let application_package_json_data = rendered_templates_cache
            .get(&application_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut application_package_json_to_write =
            serde_json::from_str::<ApplicationPackageJson>(&application_package_json_data)?;

        let project_package_json_path = base_path.join("package.json");
        let project_package_json_data = rendered_templates_cache
            .get(&project_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut project_json_to_write =
            serde_json::from_str::<ProjectPackageJson>(&project_package_json_data)?;

        let docker_compose_path = base_path.parent().unwrap().join("docker-compose.yaml");
        let mut docker_compose_data = serde_yml::from_str::<DockerCompose>(
            &rendered_templates_cache
                .get(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?
                .unwrap()
                .content,
        )?;

        if let Some(r#type) = r#type {
            change_type(
                &base_path,
                &r#type.parse()?,
                database,
                &mut manifest_data,
                &mut application_package_json_to_write,
                &mut project_json_to_write,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
                &mut removal_templates,
            )?
        }

        if let Some(description) = description {
            change_description(&description, &mut manifest_data, &mut project_json_to_write)?;
        }

        if let Some(name) = name {
            move_templates.push(change_name(
                &base_path,
                &name,
                &mut manifest_data,
                &mut project_json_to_write,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
                &mut removal_templates,
            )?);
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
            application_package_json_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: application_package_json_path.into(),
                content: serde_json::to_string_pretty(&application_package_json_to_write)?,
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

        remove_template_files(&removal_templates, dryrun, &mut stdout)?;
        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;

        move_template_files(&move_templates, dryrun, &mut stdout)?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "{} changed successfully!", &manifest_data.app_name)?;
            stdout.reset()?;
            format_code(&base_path, &manifest_data.runtime.parse()?);
        }

        Ok(())
    }
}
