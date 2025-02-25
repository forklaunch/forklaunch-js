use std::{fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use convert_case::{Case, Casing};
use ramhorns::Content;
use rustyline::{history::DefaultHistory, Editor};
use serde::{Deserialize, Serialize};
use serde_json::to_string_pretty;
use std::io::Write;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_ADD_BASE_ENTITY_TO_CORE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
        ERROR_FAILED_TO_ADD_SERVICE_METADATA_TO_ARTIFACTS, ERROR_FAILED_TO_CREATE_GITIGNORE,
        ERROR_FAILED_TO_CREATE_PACKAGE_JSON, ERROR_FAILED_TO_CREATE_SYMLINKS,
        ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_MANIFEST, ERROR_FAILED_TO_WRITE_SERVICE_FILES, VALID_WORKER_BACKENDS,
    },
    core::{
        base_path::{prompt_base_path, BasePathLocation},
        manifest::{ProjectManifestConfig, ProjectType, ResourceInventory},
    },
    prompt::{prompt_with_validation, prompt_without_validation, ArrayCompleter},
};

use super::{
    command,
    core::{
        database::{add_base_entity_to_core, match_database},
        docker::add_worker_definition_to_docker_compose,
        gitignore::generate_gitignore,
        manifest::add_project_definition_to_manifest,
        package_json::{
            add_project_definition_to_package_json,
            package_json_constants::{
                project_clean_script, project_dev_client_script, project_dev_local_worker_script,
                project_dev_worker_script, project_migrate_script, project_start_worker_script,
                project_test_script, AJV_VERSION, APP_CORE_VERSION, COMMON_VERSION, CORE_VERSION,
                DOTENV_VERSION, ESLINT_VERSION, EXPRESS_VERSION, HYPER_EXPRESS_VERSION,
                MIKRO_ORM_CLI_VERSION, MIKRO_ORM_CORE_VERSION, MIKRO_ORM_DATABASE_VERSION,
                MIKRO_ORM_MIGRATIONS_VERSION, MIKRO_ORM_REFLECTION_VERSION, PROJECT_BUILD_SCRIPT,
                PROJECT_DOCS_SCRIPT, PROJECT_FORMAT_SCRIPT, PROJECT_LINT_FIX_SCRIPT,
                PROJECT_LINT_SCRIPT, PROJECT_START_WORKER_CLIENT_SCRIPT, TSX_VERSION,
                TS_NODE_VERSION, TYPEBOX_VERSION, TYPEDOC_VERSION, TYPESCRIPT_ESLINT_VERSION,
                TYPES_UUID_VERSION, UUID_VERSION, VALIDATOR_VERSION, ZOD_VERSION,
            },
            project_package_json::{
                ProjectDependencies, ProjectDevDependencies, ProjectMikroOrm, ProjectPackageJson,
                ProjectScripts, MIKRO_ORM_CONFIG_PATHS,
            },
            update_application_package_json,
        },
        pnpm_workspace::add_project_definition_to_pnpm_workspace,
        rendered_template::{write_rendered_templates, RenderedTemplate},
        symlinks::generate_symlinks,
        template::{generate_with_template, PathIO, TemplateManifestData},
        tsconfig::generate_tsconfig,
    },
    CliCommand,
};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct WorkerManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) worker_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) pascal_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) kebab_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) db_driver: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mongo: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_worker: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) cache_backend: bool,
    }
);

impl ProjectManifestConfig for WorkerManifestData {
    fn name(&self) -> &String {
        &self.worker_name
    }
}

#[derive(Debug)]
pub(super) struct WorkerCommand;

impl WorkerCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for WorkerCommand {
    fn command(&self) -> Command {
        command("worker", "Initialize a new worker")
            .alias("wrk")
            .arg(Arg::new("name").help("The name of the worker"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path to initialize the worker in"),
            )
            .arg(
                Arg::new("backend")
                    .short('b')
                    .long("backend")
                    .help("The backend to use")
                    .value_parser(VALID_WORKER_BACKENDS),
            )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the worker"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let worker_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "Enter worker name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Worker name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let base_path = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Worker,
        )?;

        let backend = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "backend",
            matches,
            "Enter worker backend type",
            Some(&VALID_WORKER_BACKENDS),
            |input| VALID_WORKER_BACKENDS.contains(&input),
            |_| "Invalid worker backend type. Please try again".to_string(),
        )?;

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "Enter worker description (optional): ",
        )?;

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("manifest.toml");

        let mut config_data: WorkerManifestData = WorkerManifestData {
            worker_name: worker_name.clone(),
            camel_case_name: worker_name.to_case(Case::Camel),
            pascal_case_name: worker_name.to_case(Case::Pascal),
            kebab_case_name: worker_name.to_case(Case::Kebab),
            description: description.clone(),
            database: "postgresql".to_string(),
            db_driver: match_database(&backend),
            is_mongo: false,
            is_postgres: backend == "database",
            is_worker: true,
            cache_backend: backend == "cache",

            ..from_str(&read_to_string(config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?
        };

        generate_basic_worker(&worker_name, &base_path.to_string(), &mut config_data)
            .with_context(|| "Failed to create worker")?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} initialized successfully!", worker_name)?;
        stdout.reset()?;

        Ok(())
    }
}

fn generate_basic_worker(
    worker_name: &String,
    base_path: &String,
    config_data: &mut WorkerManifestData,
) -> Result<()> {
    let output_path = Path::new(base_path)
        .join(worker_name)
        .to_string_lossy()
        .to_string();
    let template_dir = PathIO {
        input_path: Path::new("project")
            .join("worker")
            .to_string_lossy()
            .to_string(),
        output_path: output_path.clone(),
    };

    let ignore_files = if config_data.cache_backend {
        vec!["mikro-orm.config.ts".to_string()]
    } else {
        vec!["consts.ts".to_string()]
    };

    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &TemplateManifestData::Worker(&config_data),
        &ignore_files,
    )?;
    rendered_templates.push(generate_project_package_json(
        config_data,
        &output_path,
        None,
        None,
        None,
        None,
    )?);
    rendered_templates
        .extend(generate_tsconfig(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_TSCONFIG)?);
    rendered_templates.extend(
        generate_gitignore(&output_path).with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?,
    );
    rendered_templates.extend(
        add_worker_to_artifacts(config_data, base_path)
            .with_context(|| ERROR_FAILED_TO_ADD_SERVICE_METADATA_TO_ARTIFACTS)?,
    );

    if !config_data.cache_backend {
        rendered_templates.extend(
            add_base_entity_to_core(&TemplateManifestData::Worker(config_data), base_path)
                .with_context(|| ERROR_FAILED_TO_ADD_BASE_ENTITY_TO_CORE)?,
        );
    }

    write_rendered_templates(&rendered_templates)
        .with_context(|| ERROR_FAILED_TO_WRITE_SERVICE_FILES)?;

    generate_symlinks(Some(base_path), &template_dir.output_path, config_data)
        .with_context(|| ERROR_FAILED_TO_CREATE_SYMLINKS)?;

    Ok(())
}

fn add_worker_to_artifacts(
    config_data: &mut WorkerManifestData,
    base_path: &String,
) -> Result<Vec<RenderedTemplate>> {
    let docker_compose_buffer =
        add_worker_definition_to_docker_compose(config_data, base_path, None)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;

    let forklaunch_manifest_buffer = add_project_definition_to_manifest(
        ProjectType::Worker,
        config_data,
        Some(ResourceInventory {
            database: if config_data.cache_backend {
                None
            } else {
                Some(config_data.database.to_owned())
            },
            cache: if config_data.cache_backend {
                Some("redis".to_string())
            } else {
                None
            },
        }),
        Some(vec![config_data.worker_name.clone()]),
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?;

    let mut package_json_buffer: Option<String> = None;
    if config_data.runtime == "bun" {
        package_json_buffer = Some(
            add_project_definition_to_package_json(config_data, base_path)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
        );
    }
    let mut pnpm_workspace_buffer: Option<String> = None;
    if config_data.runtime == "node" {
        pnpm_workspace_buffer = Some(
            add_project_definition_to_pnpm_workspace(base_path, config_data)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
        );
    }

    let mut rendered_templates = Vec::new();

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path).join("docker-compose.yaml"),
        content: docker_compose_buffer,
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: Path::new(base_path)
            .join(".forklaunch")
            .join("manifest.toml"),
        content: forklaunch_manifest_buffer.clone(),
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST.to_string()),
    });

    if !config_data.cache_backend {
        rendered_templates.push(
            update_application_package_json(
                &TemplateManifestData::Worker(config_data),
                base_path,
                package_json_buffer,
            )?
            .unwrap(),
        );
    }

    if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
        rendered_templates.push(RenderedTemplate {
            path: Path::new(base_path).join("pnpm-workspace.yaml"),
            content: pnpm_workspace_buffer,
            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE.to_string()),
        });
    }

    Ok(rendered_templates)
}

pub(crate) fn generate_project_package_json(
    config_data: &WorkerManifestData,
    base_path: &String,
    dependencies_override: Option<ProjectDependencies>,
    dev_dependencies_override: Option<ProjectDevDependencies>,
    scripts_override: Option<ProjectScripts>,
    main_override: Option<String>,
) -> Result<RenderedTemplate> {
    // fix this up
    let package_json_contents = ProjectPackageJson {
        name: Some(format!(
            "@{}/{}",
            config_data.app_name, config_data.worker_name
        )),
        version: Some("0.1.0".to_string()),
        description: Some(config_data.description.to_string()),
        keywords: Some(vec![]),
        license: Some(config_data.license.to_string()),
        author: Some(config_data.author.to_string()),
        main: main_override,
        scripts: Some(if let Some(scripts) = scripts_override {
            scripts
        } else {
            ProjectScripts {
                build: Some(PROJECT_BUILD_SCRIPT.to_string()),
                clean: Some(project_clean_script(config_data.runtime.as_str()).to_string()),
                dev_server: Some(project_dev_worker_script(
                    config_data.runtime.as_str(),
                    config_data.cache_backend,
                )),
                dev_client: Some(
                    project_dev_client_script(config_data.runtime.as_str()).to_string(),
                ),
                dev_local: Some(
                    project_dev_local_worker_script(
                        config_data.runtime.as_str(),
                        config_data.cache_backend,
                    )
                    .to_string(),
                ),
                test: Some(project_test_script(config_data.test_framework.as_str()).to_string()),
                docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
                format: Some(PROJECT_FORMAT_SCRIPT.to_string()),
                lint: Some(PROJECT_LINT_SCRIPT.to_string()),
                lint_fix: Some(PROJECT_LINT_FIX_SCRIPT.to_string()),
                migrate_create: if !config_data.cache_backend {
                    Some(project_migrate_script("create").to_string())
                } else {
                    None
                },
                migrate_down: if !config_data.cache_backend {
                    Some(project_migrate_script("down").to_string())
                } else {
                    None
                },
                migrate_init: if !config_data.cache_backend {
                    Some(project_migrate_script("init").to_string())
                } else {
                    None
                },
                migrate_up: if !config_data.cache_backend {
                    Some(project_migrate_script("up").to_string())
                } else {
                    None
                },
                start_server: Some(project_start_worker_script(config_data.cache_backend)),
                start_client: Some(PROJECT_START_WORKER_CLIENT_SCRIPT.to_string()),
                ..Default::default()
            }
        }),
        dependencies: Some(if let Some(dependencies) = dependencies_override {
            dependencies
        } else {
            ProjectDependencies {
                app_name: config_data.app_name.to_string(),
                database: Some(config_data.database.to_string()),
                app_core: Some(APP_CORE_VERSION.to_string()),
                forklaunch_common: Some(COMMON_VERSION.to_string()),
                forklaunch_core: Some(CORE_VERSION.to_string()),
                forklaunch_express: if config_data.is_express {
                    Some(EXPRESS_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_hyper_express: if config_data.is_hyper_express {
                    Some(HYPER_EXPRESS_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_validator: Some(VALIDATOR_VERSION.to_string()),
                mikro_orm_core: Some(MIKRO_ORM_CORE_VERSION.to_string()),
                mikro_orm_migrations: if !config_data.cache_backend {
                    Some(MIKRO_ORM_MIGRATIONS_VERSION.to_string())
                } else {
                    None
                },
                mikro_orm_database: if !config_data.cache_backend {
                    Some(MIKRO_ORM_DATABASE_VERSION.to_string())
                } else {
                    None
                },
                mikro_orm_reflection: if !config_data.cache_backend {
                    Some(MIKRO_ORM_REFLECTION_VERSION.to_string())
                } else {
                    None
                },
                typebox: if config_data.is_typebox {
                    Some(TYPEBOX_VERSION.to_string())
                } else {
                    None
                },
                ajv: Some(AJV_VERSION.to_string()),
                dotenv: Some(DOTENV_VERSION.to_string()),
                uuid: Some(UUID_VERSION.to_string()),
                zod: if config_data.is_zod {
                    Some(ZOD_VERSION.to_string())
                } else {
                    None
                },
            }
        }),
        dev_dependencies: Some(if let Some(dev_dependencies) = dev_dependencies_override {
            dev_dependencies
        } else {
            ProjectDevDependencies {
                eslint: Some(ESLINT_VERSION.to_string()),
                mikro_orm_cli: if !config_data.cache_backend {
                    Some(MIKRO_ORM_CLI_VERSION.to_string())
                } else {
                    None
                },
                ts_node: Some(TS_NODE_VERSION.to_string()),
                tsx: Some(TSX_VERSION.to_string()),
                typedoc: Some(TYPEDOC_VERSION.to_string()),
                typescript_eslint: Some(TYPESCRIPT_ESLINT_VERSION.to_string()),
                types_uuid: Some(TYPES_UUID_VERSION.to_string()),
            }
        }),
        mikro_orm: Some(ProjectMikroOrm {
            config_paths: Some(
                MIKRO_ORM_CONFIG_PATHS
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
            ),
        }),
    };
    Ok(RenderedTemplate {
        path: Path::new(base_path).join("package.json"),
        content: to_string_pretty(&package_json_contents)?,
        context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
    })
}
