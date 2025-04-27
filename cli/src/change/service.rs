use std::{
    collections::{HashMap, HashSet},
    fs::read_to_string,
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use convert_case::{Case, Casing};
use dialoguer::{theme::ColorfulTheme, MultiSelect};
use rustyline::{history::DefaultHistory, Editor};
use serde_json::from_str;
use termcolor::{ColorChoice, StandardStream};
use walkdir::WalkDir;

use crate::{
    constants::{
        Database, Infrastructure, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        ast::transformations::{
            transform_base_entity_ts::transform_base_entity_ts,
            transform_mikroorm_config_ts::transform_mikroorm_config_ts,
            transform_registrations_infrastructure_redis::transform_registrations_infrastructure_redis_ts,
        },
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        database::is_in_memory_database,
        docker::{
            add_database_to_docker_compose, add_redis_to_docker_compose,
            clean_up_unused_database_services, DockerCompose,
        },
        manifest::{service::ServiceManifestData, ManifestData},
        package_json::project_package_json::ProjectPackageJson,
        removal_template::{remove_template_files, RemovalTemplate},
        rendered_template::{write_rendered_templates, RenderedTemplate, TEMPLATES_DIR},
        watermark::apply_watermark,
    },
    prompt::{
        prompt_comma_separated_list, prompt_comma_separated_list_from_selections,
        prompt_field_from_selections_with_validation, ArrayCompleter,
    },
    CliCommand,
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
    manifest_data: &mut ServiceManifestData,
    project_package_json: &mut ProjectPackageJson,
    rendered_templates_cache: &mut HashMap<String, RenderedTemplate>,
) -> Result<Vec<RemovalTemplate>> {
    let existing_name = base_path.file_name().unwrap().to_string_lossy().to_string();

    let mut removal_templates = vec![];

    manifest_data.service_name = name.to_string();
    manifest_data
        .projects
        .iter_mut()
        .find(|project| project.name == existing_name)
        .unwrap()
        .name = name.to_string();

    project_package_json.name = Some(format!("@{}/{}", manifest_data.app_name, name.to_string()));

    let existing_camel_case_name = existing_name.to_case(Case::Camel);
    let existing_kebab_case_name = existing_name.to_case(Case::Kebab);
    let existing_pascal_case_name = existing_name.to_case(Case::Pascal);

    // #TODO: move this into router change name function
    let camel_case_name = name.to_case(Case::Camel);
    let kebab_case_name = name.to_case(Case::Kebab);
    let pascal_case_name = name.to_case(Case::Pascal);

    TEMPLATES_DIR
        .get_dir("router")
        .unwrap()
        .entries()
        .into_iter()
        .for_each(|top_level_folder| {
            for entry in WalkDir::new(base_path.join(&top_level_folder.path().file_name().unwrap()))
            {
                let entry = entry.unwrap();
                if entry.file_type().is_file() {
                    let path = entry.path();
                    if let Some(content) = read_to_string(path).ok() {
                        let new_content = content
                            .replace(&existing_pascal_case_name, &pascal_case_name)
                            .replace(&existing_kebab_case_name, &kebab_case_name)
                            .replace(&existing_camel_case_name, &camel_case_name)
                            .replace(&existing_name, &name);
                        let new_path = path
                            .to_string_lossy()
                            .replace(&existing_pascal_case_name, &pascal_case_name)
                            .replace(&existing_kebab_case_name, &kebab_case_name)
                            .replace(&existing_camel_case_name, &camel_case_name)
                            .replace(&existing_name, &name);
                        if content != new_content {
                            rendered_templates_cache.insert(
                                new_path.clone(),
                                RenderedTemplate {
                                    path: new_path.clone().into(),
                                    content: new_content,
                                    context: None,
                                },
                            );
                            if path.to_string_lossy().to_string() != new_path {
                                removal_templates.push(RemovalTemplate { path: path.into() })
                            }
                        }
                    }
                }
            }
        });

    Ok(removal_templates)
}

fn change_database(
    base_path: &Path,
    database: &Database,
    manifest_data: &mut ServiceManifestData,
    project_package_json: &mut ProjectPackageJson,
    docker_compose_data: &mut DockerCompose,
    rendered_templates_cache: &mut HashMap<String, RenderedTemplate>,
) -> Result<Option<RemovalTemplate>> {
    if manifest_data.database == database.to_string() {
        return Ok(None);
    }

    let existing_database = manifest_data.database.parse()?;

    manifest_data.database = database.to_string();

    let manifest_data_clone = manifest_data.clone();
    let project = manifest_data
        .projects
        .iter_mut()
        .find(|project_entry| {
            project_entry.name == base_path.file_name().unwrap().to_string_lossy().to_string()
        })
        .unwrap();
    project.resources.as_mut().unwrap().database = Some(database.to_string());

    project_package_json.dependencies.as_mut().unwrap().database = Some(database.to_string());

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

    docker_compose_data
        .services
        .get_mut(&project.name)
        .unwrap()
        .environment = Some(existing_docker_service_environment);

    clean_up_unused_database_services(
        docker_compose_data,
        &manifest_data
            .projects
            .iter()
            .map(|p| p.resources.as_ref().unwrap().database.clone().unwrap())
            .collect::<HashSet<String>>(),
    )?;

    let mikro_orm_config_path = base_path.join("mikro-orm.config.ts");
    rendered_templates_cache.insert(
        mikro_orm_config_path.to_string_lossy().to_string(),
        RenderedTemplate {
            path: mikro_orm_config_path,
            content: transform_mikroorm_config_ts(
                &base_path,
                database,
                is_in_memory_database(&database),
            )?,
            context: None,
        },
    );

    if let Some(base_entity_ts_content) = transform_base_entity_ts(&base_path, database)? {
        let entity_path = base_path
            .parent()
            .unwrap()
            .join("core")
            .join("persistence")
            .join("entity.ts");
        rendered_templates_cache.insert(
            entity_path.to_string_lossy().to_string(),
            RenderedTemplate {
                path: entity_path,
                content: base_entity_ts_content,
                context: None,
            },
        );
    }

    let import_source_from = match existing_database {
        Database::MongoDB => "sql.base.entity.ts",
        _ => "nosql.base.entity.ts",
    };
    let import_source_to = match database {
        Database::MongoDB => "nosql.base.entity.ts",
        _ => "sql.base.entity.ts",
    };

    let base_entity_from = match existing_database {
        Database::MongoDB => "SqlBaseEntity",
        _ => "NoSqlBaseEntity",
    };
    let base_entity_to = match database {
        Database::MongoDB => "NoSqlBaseEntity",
        _ => "SqlBaseEntity",
    };
    let entities_path = base_path.join("persistence").join("entities");
    for entry in WalkDir::new(&entities_path) {
        let entry = entry?;
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(content) = read_to_string(path).ok() {
                let new_content = content
                    .replace(base_entity_from, base_entity_to)
                    .replace(import_source_from, import_source_to);
                if content != new_content {
                    rendered_templates_cache.insert(
                        path.to_string_lossy().to_string(),
                        RenderedTemplate {
                            path: path.to_path_buf(),
                            content: new_content,
                            context: None,
                        },
                    );
                }
            }
        }
    }

    let existing_base_entity_path = base_path
        .join("core")
        .join("persistence")
        .join(import_source_from);
    if apply_watermark(&RenderedTemplate {
        path: existing_base_entity_path.clone().into(),
        content: TEMPLATES_DIR
            .get_file(
                Path::new("project")
                    .join("core")
                    .join("persistence")
                    .join(import_source_from),
            )
            .unwrap()
            .contents_utf8()
            .unwrap()
            .to_string(),
        context: None,
    })? == read_to_string(&existing_base_entity_path)?
    {
        return Ok(Some(RemovalTemplate {
            path: existing_base_entity_path,
        }));
    }

    Ok(None)
}

fn change_description(
    description: &str,
    manifest_data: &mut ServiceManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    manifest_data.description = description.to_string();
    project_package_json.description = Some(description.to_string());

    Ok(())
}

fn change_infrastructure(
    base_path: &Path,
    infrastructure_to_add: Vec<Infrastructure>,
    manifest_data: &mut ServiceManifestData,
    docker_compose: &mut DockerCompose,
    rendered_templates_cache: &mut HashMap<String, RenderedTemplate>,
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
                let mut env_local_content = read_to_string(&env_local_path)?;

                if !env_local_content.contains("REDIS_URL") {
                    env_local_content = format!(
                        "{}\n{}",
                        env_local_content, "REDIS_URL=redis://localhost:6379"
                    );
                }

                rendered_templates_cache.insert(
                    env_local_path.to_string_lossy().to_string(),
                    RenderedTemplate {
                        path: env_local_path,
                        content: env_local_content,
                        context: None,
                    },
                );

                let registrations_path = base_path.join("registrations.ts");
                rendered_templates_cache.insert(
                    registrations_path.to_string_lossy().to_string(),
                    RenderedTemplate {
                        path: registrations_path.clone(),
                        content: transform_registrations_infrastructure_redis_ts(
                            &base_path,
                            Some(&read_to_string(&registrations_path)?),
                        )?,
                        context: None,
                    },
                );
            }
        }
    }

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
                    .help("The application root path"),
            )
            .arg(
                Arg::new("name")
                    .short('N')
                    .help("The name of the application"),
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
    }

    fn handler(&self, matches: &clap::ArgMatches) -> anyhow::Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Application,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data: ServiceManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let project = manifest_data
            .projects
            .iter_mut()
            .find(|project| project.name == manifest_data.service_name)
            .unwrap();

        let name = matches.get_one::<String>("name");
        let database = matches.get_one::<String>("database");
        let description = matches.get_one::<String>("description");
        let infrastructure = matches.get_one::<Vec<String>>("infrastructure");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if !matches.args_present() {
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
            "Enter application name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Application name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let database = prompt_field_from_selections_with_validation(
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
        )?;

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

        let mut active_infrastructure = vec![];
        let project_resources = project.resources.as_ref().unwrap();
        if let Some(database) = &project_resources.database {
            active_infrastructure.push(database.to_string());
        }
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
            "Enter infrastructure: ",
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

        let project_package_json_path = base_path.join("package.json");
        let project_package_json_data = read_to_string(&project_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;

        let mut project_json_to_write =
            serde_json::from_str::<ProjectPackageJson>(&project_package_json_data)?;

        let docker_compose_path = base_path.parent().unwrap().join("docker-compose.yaml");
        let mut docker_compose_data = from_str::<DockerCompose>(
            &read_to_string(docker_compose_path.clone())
                .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
        )?;

        let mut rendered_templates_cache = HashMap::new();

        if let Some(name) = name {
            removal_templates.extend(change_name(
                &base_path,
                &name,
                &mut manifest_data,
                &mut project_json_to_write,
                &mut rendered_templates_cache,
            )?);
        }
        if let Some(database) = database {
            if let Some(removal_template) = change_database(
                &base_path,
                &database.parse()?,
                &mut manifest_data,
                &mut project_json_to_write,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
            )? {
                removal_templates.push(removal_template)
            };
        }
        if let Some(description) = description {
            change_description(&description, &mut manifest_data, &mut project_json_to_write);
        }

        if let Some(infrastructure) = infrastructure {
            change_infrastructure(
                &base_path,
                infrastructure
                    .iter()
                    .map(|s| s.parse::<Infrastructure>().unwrap())
                    .collect(),
                &mut manifest_data,
                &mut docker_compose_data,
                &mut rendered_templates_cache,
            );
        }

        rendered_templates_cache.insert(
            config_path.clone().to_string_lossy().to_string(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            docker_compose_path.clone().to_string_lossy().to_string(),
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

        write_rendered_templates(
            &rendered_templates_cache.into_values().collect(),
            dryrun,
            &mut stdout,
        )?;
        remove_template_files(&removal_templates, dryrun, &mut stdout)?;

        Ok(())
    }
}
