use std::{collections::HashSet, io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use dialoguer::{MultiSelect, theme::ColorfulTheme};
use indexmap::IndexMap;
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
        ERROR_FAILED_TO_READ_MANIFEST, ERROR_FAILED_TO_READ_PACKAGE_JSON, Infrastructure,
    },
    core::{
        ast::{
            deletions::delete_from_registrations_ts::{
                delete_from_registrations_ts_infrastructure_redis,
                delete_from_registrations_ts_infrastructure_s3,
            },
            transformations::{
                transform_mikroorm_config_ts::transform_mikroorm_config_ts,
                transform_registrations_ts::{
                    transform_registrations_ts_infrastructure_redis,
                    transform_registrations_ts_infrastructure_s3,
                },
            },
        },
        base_path::find_app_root_path,
        command::command,
        database::{get_database_variants, is_in_memory_database},
        docker::{
            DependencyCondition, DependsOn, DockerCompose, add_database_to_docker_compose,
            add_redis_to_docker_compose, add_s3_to_docker_compose,
            clean_up_unused_infrastructure_services, remove_redis_from_docker_compose,
            remove_s3_from_docker_compose, update_dockerfile_contents,
        },
        env::Env,
        format::format_code,
        manifest::{
            InitializableManifestConfig, InitializableManifestConfigMetadata, ManifestData,
            MutableManifestData, ProjectInitializationMetadata, service::ServiceManifestData,
        },
        move_template::{MoveTemplate, move_template_files},
        name::validate_name,
        package_json::{
            application_package_json::ApplicationPackageJson,
            package_json_constants::{INFRASTRUCTURE_REDIS_VERSION, INFRASTRUCTURE_S3_VERSION},
            project_package_json::ProjectPackageJson,
        },
        removal_template::{RemovalTemplate, remove_template_files},
        rendered_template::{RenderedTemplate, RenderedTemplatesCache, write_rendered_templates},
    },
    prompt::{
        ArrayCompleter, prompt_comma_separated_list_from_selections,
        prompt_field_from_selections_with_validation,
    },
};

#[derive(Debug)]
pub(super) struct ServiceCommand;

impl ServiceCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

fn change_name(
    base_path: &Path,
    name: &str,
    confirm: bool,
    manifest_data: &mut ServiceManifestData,
    application_package_json: &mut ApplicationPackageJson,
    project_package_json: &mut ProjectPackageJson,
    docker_compose: &mut DockerCompose,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    removal_templates: &mut Vec<RemovalTemplate>,
    stdout: &mut StandardStream,
) -> Result<MoveTemplate> {
    change_name_core(
        base_path,
        name,
        confirm,
        MutableManifestData::Service(manifest_data),
        application_package_json,
        project_package_json,
        Some(docker_compose),
        rendered_templates_cache,
        removal_templates,
        stdout,
    )
}

fn change_database(
    base_path: &Path,
    database: &Database,
    manifest_data: &mut ServiceManifestData,
    application_package_json: &mut ApplicationPackageJson,
    project_package_json: &mut ProjectPackageJson,
    docker_compose_data: &mut DockerCompose,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    removal_templates: &mut Vec<RemovalTemplate>,
) -> Result<()> {
    if manifest_data.database == database.to_string() {
        return Ok(());
    }

    let existing_database = manifest_data.database.parse::<Database>()?;
    manifest_data.database = database.to_string();

    let manifest_data_clone = manifest_data.clone();
    let project = manifest_data
        .projects
        .iter_mut()
        .find(|project_entry| {
            project_entry.name == base_path.file_name().unwrap().to_string_lossy()
        })
        .unwrap();
    project.resources.as_mut().unwrap().database = Some(database.to_string());

    project_package_json
        .dependencies
        .as_mut()
        .unwrap()
        .databases = HashSet::from([database.clone()]);

    let existing_docker_service = docker_compose_data.services.get(&project.name).unwrap();
    let mut existing_docker_service_environment = existing_docker_service
        .environment
        .as_ref()
        .unwrap()
        .clone();

    add_database_to_docker_compose(
        &ManifestData::Service(&manifest_data_clone),
        docker_compose_data,
        &mut existing_docker_service_environment,
    )?;

    let dockerfile_key = base_path.parent().unwrap().join("Dockerfile");
    let dockerfile = rendered_templates_cache.get(&dockerfile_key)?;
    if let Some(dockerfile_template) = dockerfile {
        rendered_templates_cache.insert(
            dockerfile_key.to_string_lossy(),
            RenderedTemplate {
                path: dockerfile_key.clone(),
                content: update_dockerfile_contents(
                    &dockerfile_template.content,
                    &manifest_data.runtime.parse()?,
                    is_in_memory_database(database),
                )?,
                context: None,
            },
        );
    }

    let docker_service = docker_compose_data.services.get_mut(&project.name).unwrap();

    docker_service.environment = Some(existing_docker_service_environment);

    let mut index_map = IndexMap::new();
    let depends_on = docker_service.depends_on.as_mut().unwrap_or(&mut index_map);
    for database in Database::VARIANTS {
        if depends_on.contains_key(&database.to_string()) {
            depends_on.shift_remove(&database.to_string());
        }
    }
    depends_on.insert(
        database.to_string(),
        DependsOn {
            condition: DependencyCondition::ServiceStarted,
        },
    );

    let projects = manifest_data.projects.clone();
    clean_up_unused_infrastructure_services(docker_compose_data, projects)?;

    let mikro_orm_config_path = base_path.join("mikro-orm.config.ts");
    rendered_templates_cache.insert(
        mikro_orm_config_path.to_string_lossy(),
        RenderedTemplate {
            path: mikro_orm_config_path.clone(),
            content: transform_mikroorm_config_ts(&base_path, &Some(existing_database), database)?,
            context: None,
        },
    );

    let env_local_path = base_path.join(".env.local");
    let env_local_content = rendered_templates_cache
        .get(&env_local_path)?
        .unwrap()
        .content;
    let mut env_local_content = serde_envfile::from_str::<Env>(&env_local_content)?;

    change_database_env_variables(
        &mut env_local_content,
        &manifest_data.app_name,
        &manifest_data.service_name,
        database,
    );

    change_database_postinstall_script(application_package_json, database);

    let removal_template = change_database_base_entity(
        base_path,
        database,
        &existing_database,
        manifest_data.projects.clone(),
        &manifest_data.service_name,
        rendered_templates_cache,
    )?;

    if let Some(removal_template) = removal_template {
        removal_templates.push(removal_template);
    }

    Ok(())
}

fn change_description(
    description: &str,
    manifest_data: &mut ServiceManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    change_description_core(
        description,
        MutableManifestData::Service(manifest_data),
        project_package_json,
    )
}

fn change_infrastructure(
    base_path: &Path,
    infrastructure_to_add: Vec<Infrastructure>,
    infrastructure_to_remove: Vec<Infrastructure>,
    project_package_json: &mut ProjectPackageJson,
    manifest_data: &mut ServiceManifestData,
    docker_compose: &mut DockerCompose,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<()> {
    for infrastructure in infrastructure_to_add {
        match infrastructure {
            Infrastructure::Redis => {
                let mut environment = docker_compose
                    .services
                    .get_mut(&manifest_data.service_name)
                    .unwrap()
                    .environment
                    .as_ref()
                    .unwrap()
                    .clone();
                add_redis_to_docker_compose(
                    &manifest_data.app_name,
                    docker_compose,
                    &mut environment,
                )?;
                docker_compose
                    .services
                    .get_mut(&manifest_data.service_name)
                    .unwrap()
                    .environment = Some(environment);

                let env_local_path = base_path.join(".env.local");
                let mut env_local_content = serde_envfile::from_str::<Env>(
                    &rendered_templates_cache
                        .get(&env_local_path)?
                        .unwrap()
                        .content,
                )?;

                env_local_content.redis_url = Some("redis://localhost:6379".to_string());

                rendered_templates_cache.insert(
                    env_local_path.to_string_lossy(),
                    RenderedTemplate {
                        path: env_local_path.clone(),
                        content: serde_envfile::to_string(&env_local_content)?,
                        context: None,
                    },
                );

                let registrations_path = base_path.join("registrations.ts");
                rendered_templates_cache.insert(
                    registrations_path.to_string_lossy(),
                    RenderedTemplate {
                        path: registrations_path.clone(),
                        content: transform_registrations_ts_infrastructure_redis(
                            &base_path,
                            rendered_templates_cache
                                .get(&registrations_path)?
                                .and_then(|v| Some(v.content.clone())),
                        )?,
                        context: None,
                    },
                );

                project_package_json
                    .dependencies
                    .as_mut()
                    .unwrap()
                    .forklaunch_infrastructure_redis =
                    Some(INFRASTRUCTURE_REDIS_VERSION.to_string());

                manifest_data.projects.iter_mut().for_each(|project| {
                    if project.name == manifest_data.service_name {
                        project.resources.as_mut().unwrap().cache =
                            Some(Infrastructure::Redis.to_string());
                    }
                });
            }
            Infrastructure::S3 => {
                let mut environment = docker_compose
                    .services
                    .get_mut(&manifest_data.service_name)
                    .unwrap()
                    .environment
                    .as_ref()
                    .unwrap()
                    .clone();
                add_s3_to_docker_compose(
                    &manifest_data.app_name,
                    &manifest_data.service_name,
                    docker_compose,
                    &mut environment,
                )?;
                docker_compose
                    .services
                    .get_mut(&manifest_data.service_name)
                    .unwrap()
                    .environment = Some(environment);

                let env_local_path = base_path.join(".env.local");
                let mut env_local_content = serde_envfile::from_str::<Env>(
                    &rendered_templates_cache
                        .get(&env_local_path)?
                        .unwrap()
                        .content,
                )?;

                env_local_content.s3_url = Some("http://localhost:9000".to_string());
                env_local_content.s3_bucket = Some(format!(
                    "{}-{}-dev",
                    manifest_data.app_name, manifest_data.service_name
                ));
                env_local_content.s3_region = Some("us-east-1".to_string());
                env_local_content.s3_access_key = Some("minioadmin".to_string());
                env_local_content.s3_secret_key = Some("minioadmin".to_string());

                rendered_templates_cache.insert(
                    env_local_path.to_string_lossy(),
                    RenderedTemplate {
                        path: env_local_path.clone(),
                        content: serde_envfile::to_string(&env_local_content)?,
                        context: None,
                    },
                );

                let registrations_path = base_path.join("registrations.ts");
                rendered_templates_cache.insert(
                    registrations_path.to_string_lossy(),
                    RenderedTemplate {
                        path: registrations_path.clone(),
                        content: transform_registrations_ts_infrastructure_s3(
                            &base_path,
                            rendered_templates_cache
                                .get(&registrations_path)?
                                .and_then(|v| Some(v.content.clone())),
                        )?,
                        context: None,
                    },
                );

                project_package_json
                    .dependencies
                    .as_mut()
                    .unwrap()
                    .forklaunch_infrastructure_s3 = Some(INFRASTRUCTURE_S3_VERSION.to_string());

                manifest_data.projects.iter_mut().for_each(|project| {
                    if project.name == manifest_data.service_name {
                        project.resources.as_mut().unwrap().object_store =
                            Some(Infrastructure::S3.to_string());
                    }
                });
            }
        }
    }

    for infrastructure in infrastructure_to_remove {
        match infrastructure {
            Infrastructure::Redis => {
                if !manifest_data.projects.iter_mut().any(|project| {
                    if let Some(resources) = &mut project.resources {
                        if let Some(cache) = &mut resources.cache {
                            cache == &Infrastructure::Redis.to_string()
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                }) {
                    let mut environment = docker_compose
                        .services
                        .get_mut(&manifest_data.service_name)
                        .unwrap()
                        .environment
                        .as_ref()
                        .unwrap()
                        .clone();
                    remove_redis_from_docker_compose(docker_compose, &mut environment)?;
                    docker_compose
                        .services
                        .get_mut(&manifest_data.service_name)
                        .unwrap()
                        .environment = Some(environment);
                }

                let env_local_path = base_path.join(".env.local");
                let mut env_local_content = serde_envfile::from_str::<Env>(
                    &rendered_templates_cache
                        .get(&env_local_path)?
                        .unwrap()
                        .content,
                )?;

                env_local_content.redis_url = None;

                rendered_templates_cache.insert(
                    env_local_path.to_string_lossy(),
                    RenderedTemplate {
                        path: env_local_path.clone(),
                        content: serde_envfile::to_string(&env_local_content)?,
                        context: None,
                    },
                );

                let registrations_path = base_path.join("registrations.ts");
                rendered_templates_cache.insert(
                    registrations_path.to_string_lossy(),
                    RenderedTemplate {
                        path: registrations_path.clone(),
                        content: delete_from_registrations_ts_infrastructure_redis(
                            &base_path,
                            rendered_templates_cache
                                .get(&registrations_path)?
                                .and_then(|v| Some(v.content.clone())),
                        )?,
                        context: None,
                    },
                );

                project_package_json
                    .dependencies
                    .as_mut()
                    .unwrap()
                    .forklaunch_infrastructure_redis = None;

                manifest_data.projects.iter_mut().for_each(|project| {
                    if project.name == manifest_data.service_name {
                        project.resources.as_mut().unwrap().cache = None;
                    }
                });
            }
            Infrastructure::S3 => {
                if !manifest_data.projects.iter_mut().any(|project| {
                    if let Some(resources) = &mut project.resources {
                        if let Some(object_store) = &mut resources.object_store {
                            object_store == &Infrastructure::S3.to_string()
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                }) {
                    let mut environment = docker_compose
                        .services
                        .get_mut(&manifest_data.service_name)
                        .unwrap()
                        .environment
                        .as_ref()
                        .unwrap()
                        .clone();
                    remove_s3_from_docker_compose(docker_compose, &mut environment)?;
                    docker_compose
                        .services
                        .get_mut(&manifest_data.service_name)
                        .unwrap()
                        .environment = Some(environment);
                }

                let env_local_path = base_path.join(".env.local");
                let mut env_local_content = serde_envfile::from_str::<Env>(
                    &rendered_templates_cache
                        .get(&env_local_path)?
                        .unwrap()
                        .content,
                )?;

                env_local_content.s3_bucket = None;
                env_local_content.s3_url = None;
                env_local_content.s3_region = None;
                env_local_content.s3_access_key = None;
                env_local_content.s3_secret_key = None;

                rendered_templates_cache.insert(
                    env_local_path.to_string_lossy(),
                    RenderedTemplate {
                        path: env_local_path.clone(),
                        content: serde_envfile::to_string(&env_local_content)?,
                        context: None,
                    },
                );

                let registrations_path = base_path.join("registrations.ts");
                rendered_templates_cache.insert(
                    registrations_path.to_string_lossy(),
                    RenderedTemplate {
                        path: registrations_path.clone(),
                        content: delete_from_registrations_ts_infrastructure_s3(
                            &base_path,
                            rendered_templates_cache
                                .get(&registrations_path)?
                                .and_then(|v| Some(v.content.clone())),
                        )?,
                        context: None,
                    },
                );

                project_package_json
                    .dependencies
                    .as_mut()
                    .unwrap()
                    .forklaunch_infrastructure_s3 = None;

                manifest_data.projects.iter_mut().for_each(|project| {
                    if project.name == manifest_data.service_name {
                        project.resources.as_mut().unwrap().object_store = None;
                    }
                });
            }
        }
    }

    clean_up_unused_infrastructure_services(docker_compose, manifest_data.projects.clone())?;

    Ok(())
}

impl CliCommand for ServiceCommand {
    fn command(&self) -> Command {
        command("service", "Change a forklaunch service")
            .alias("svc")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The service path"),
            )
            .arg(Arg::new("name").short('N').help("The name of the service"))
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
                Arg::new("infrastructure")
                    .short('i')
                    .long("infrastructure")
                    .help("The infrastructure to use")
                    .value_parser(Infrastructure::VARIANTS)
                    .num_args(0..)
                    .action(ArgAction::Append),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("confirm")
                    .short('c')
                    .long("confirm")
                    .help("Flag to confirm any prompts")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let mut rendered_templates_cache = RenderedTemplatesCache::new();

        let (app_root_path, project_name) = find_app_root_path(matches, None)?;
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data = toml::from_str::<ServiceManifestData>(
            &rendered_templates_cache
                .get(&manifest_path)
                .with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?
                .unwrap()
                .content,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        .initialize(InitializableManifestConfigMetadata::Project(
            ProjectInitializationMetadata {
                project_name: project_name.clone(),
            },
        ));

        let service_base_path = app_root_path
            .join(manifest_data.modules_path.clone())
            .join(project_name.clone());

        let runtime = manifest_data.runtime.parse()?;

        let project = manifest_data
            .projects
            .iter_mut()
            .find(|project| project.name == manifest_data.service_name)
            .unwrap();

        let name = matches.get_one::<String>("name");
        let database = matches.get_one::<String>("database");
        let description = matches.get_one::<String>("description");
        let infrastructure = matches
            .get_many::<String>("infrastructure")
            .map(|v| v.map(|s| s.to_string()).collect());
        let dryrun = matches.get_flag("dryrun");
        let confirm = matches.get_flag("confirm");

        let selected_options = if matches.ids().all(|id| id == "dryrun" || id == "confirm") {
            let options = vec!["name", "database", "description", "infrastructure"];

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
            "service name",
            None,
            |input: &str| validate_name(input) && !manifest_data.app_name.contains(input),
            |_| {
                "Service name cannot be a substring of the application name, empty or include numbers or spaces. Please try again"
                    .to_string()
            },
        )?;

        let database_variants = get_database_variants(&runtime);
        let database = prompt_field_from_selections_with_validation(
            "database",
            database,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "database",
            Some(database_variants),
            |input: &str| database_variants.contains(&input),
            |_| "Invalid database. Please try again".to_string(),
        )?;

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

        let mut active_infrastructure = vec![];
        let project_resources = project.resources.as_ref().unwrap();

        if let Some(cache) = &project_resources.cache {
            active_infrastructure.push(cache.to_string());
        }
        if let Some(queue) = &project_resources.queue {
            active_infrastructure.push(queue.to_string());
        }

        let infrastructure = prompt_comma_separated_list_from_selections(
            "infrastructure",
            infrastructure,
            &selected_options,
            &mut line_editor,
            matches,
            "infrastructure",
            &Infrastructure::VARIANTS,
            Some(
                active_infrastructure
                    .iter()
                    .map(|s| s.as_str())
                    .collect::<Vec<&str>>()
                    .as_slice(),
            ),
        )?;

        let mut removal_templates = vec![];
        let mut move_templates = vec![];

        let application_package_json_path =
            service_base_path.parent().unwrap().join("package.json");
        let application_package_json_data = rendered_templates_cache
            .get(&application_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut application_package_json_to_write =
            serde_json::from_str::<ApplicationPackageJson>(&application_package_json_data)?;

        let project_package_json_path = service_base_path.join("package.json");
        let project_package_json_data = rendered_templates_cache
            .get(&project_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?
            .unwrap()
            .content;

        let mut project_json_to_write =
            serde_json::from_str::<ProjectPackageJson>(&project_package_json_data)?;

        let docker_compose_path =
            if let Some(docker_compose_path) = &manifest_data.docker_compose_path {
                app_root_path.join(docker_compose_path)
            } else {
                app_root_path.join("docker-compose.yaml")
            };
        let mut docker_compose_data = serde_yml::from_str::<DockerCompose>(
            &rendered_templates_cache
                .get(&docker_compose_path)
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?
                .unwrap()
                .content,
        )?;

        if let Some(database) = database {
            change_database(
                &service_base_path,
                &database.parse()?,
                &mut manifest_data,
                &mut application_package_json_to_write,
                &mut project_json_to_write,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
                &mut removal_templates,
            )?;
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "migrate:init or migrate:create will need to be run")?;
            stdout.reset()?;
        }

        if let Some(description) = description {
            change_description(&description, &mut manifest_data, &mut project_json_to_write)?;
        }

        if let Some(infrastructure) = infrastructure {
            let infrastructure_to_add: Vec<Infrastructure> = infrastructure
                .iter()
                .filter(|s| !active_infrastructure.contains(s))
                .map(|s| s.parse::<Infrastructure>().unwrap())
                .collect();

            let infrastructure_to_remove: Vec<Infrastructure> = active_infrastructure
                .iter()
                .filter(|s| !infrastructure.contains(s))
                .map(|s| s.parse::<Infrastructure>().unwrap())
                .collect();

            change_infrastructure(
                &service_base_path,
                infrastructure_to_add,
                infrastructure_to_remove,
                &mut project_json_to_write,
                &mut manifest_data,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
            )?;
        }

        if let Some(name) = name {
            move_templates.push(change_name(
                &service_base_path,
                &name,
                confirm,
                &mut manifest_data,
                &mut application_package_json_to_write,
                &mut project_json_to_write,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
                &mut removal_templates,
                &mut stdout,
            )?);
        }

        rendered_templates_cache.insert(
            manifest_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: manifest_path.to_path_buf(),
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
            writeln!(
                stdout,
                "{} changed successfully!",
                &manifest_data.service_name
            )?;
            stdout.reset()?;
            format_code(&service_base_path, &manifest_data.runtime.parse()?);
        }

        Ok(())
    }
}
