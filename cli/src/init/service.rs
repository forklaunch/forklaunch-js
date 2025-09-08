use std::{
    collections::{HashMap, HashSet},
    fs::read_to_string,
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::to_string_pretty;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str;

use crate::{
    CliCommand,
    constants::{
        Database, ERROR_FAILED_TO_ADD_BASE_ENTITY_TO_CORE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
        ERROR_FAILED_TO_ADD_SERVICE_METADATA_TO_ARTIFACTS, ERROR_FAILED_TO_CREATE_GITIGNORE,
        ERROR_FAILED_TO_CREATE_PACKAGE_JSON, ERROR_FAILED_TO_CREATE_SYMLINKS,
        ERROR_FAILED_TO_CREATE_TSCONFIG, ERROR_FAILED_TO_PARSE_MANIFEST,
        ERROR_FAILED_TO_READ_MANIFEST, ERROR_FAILED_TO_UPDATE_DOCKERFILE,
        ERROR_FAILED_TO_WRITE_SERVICE_FILES, Infrastructure, Runtime, TestFramework,
    },
    core::{
        base_path::{BasePathLocation, BasePathType, prompt_base_path},
        command::command,
        database::{
            add_base_entity_to_core, get_database_port, get_db_driver, is_in_memory_database,
        },
        docker::{add_service_definition_to_docker_compose, update_dockerfile_contents},
        flexible_path::{create_module_config, find_manifest_path},
        format::format_code,
        gitignore::generate_gitignore,
        manifest::{
            ApplicationInitializationMetadata, InitializableManifestConfig,
            InitializableManifestConfigMetadata, ManifestData, ProjectType, ResourceInventory,
            add_project_definition_to_manifest, application::ApplicationManifestData,
            service::ServiceManifestData,
        },
        name::validate_name,
        package_json::{
            add_project_definition_to_package_json,
            package_json_constants::{
                AJV_VERSION, APP_CORE_VERSION, APP_MONITORING_VERSION,
                BETTER_AUTH_MIKRO_ORM_VERSION, BETTER_AUTH_VERSION, BETTER_SQLITE3_VERSION,
                BILLING_BASE_VERSION, BILLING_INTERFACES_VERSION, BILLING_STRIPE_VERSION,
                BIOME_VERSION, COMMON_VERSION, CORE_VERSION, DOTENV_VERSION, ESLINT_VERSION,
                EXPRESS_VERSION, HYPER_EXPRESS_VERSION, IAM_BASE_VERSION, IAM_INTERFACES_VERSION,
                INFRASTRUCTURE_REDIS_VERSION, INFRASTRUCTURE_S3_VERSION, INTERNAL_VERSION,
                MIKRO_ORM_CLI_VERSION, MIKRO_ORM_CORE_VERSION, MIKRO_ORM_DATABASE_VERSION,
                MIKRO_ORM_MIGRATIONS_VERSION, MIKRO_ORM_REFLECTION_VERSION,
                MIKRO_ORM_SEEDER_VERSION, OPENTELEMETRY_API_VERSION, OXLINT_VERSION,
                PRETTIER_VERSION, PROJECT_BUILD_SCRIPT, PROJECT_DOCS_SCRIPT, PROJECT_SEED_SCRIPT,
                SQLITE3_VERSION, STRIPE_VERSION, TSX_VERSION, TYPEBOX_VERSION, TYPEDOC_VERSION,
                TYPES_EXPRESS_SERVE_STATIC_CORE_VERSION, TYPES_EXPRESS_VERSION, TYPES_QS_VERSION,
                TYPES_UUID_VERSION, TYPESCRIPT_ESLINT_VERSION, UUID_VERSION, VALIDATOR_VERSION,
                ZOD_VERSION, project_clean_script, project_dev_local_script,
                project_dev_server_script, project_format_script, project_lint_fix_script,
                project_lint_script, project_migrate_script, project_start_server_script,
                project_test_script,
            },
            project_package_json::{
                MIKRO_ORM_CONFIG_PATHS, ProjectDependencies, ProjectDevDependencies,
                ProjectMikroOrm, ProjectPackageJson, ProjectScripts,
            },
            update_application_package_json,
        },
        pnpm_workspace::add_project_definition_to_pnpm_workspace,
        rendered_template::{RenderedTemplate, write_rendered_templates},
        symlinks::generate_symlinks,
        template::{PathIO, generate_with_template},
        tsconfig::generate_tsconfig,
        universal_sdk::add_project_to_universal_sdk,
    },
    prompt::{
        ArrayCompleter, prompt_comma_separated_list, prompt_with_validation,
        prompt_without_validation,
    },
};

fn generate_basic_service(
    service_name: &String,
    base_path: &Path,
    app_root_path: &Path,
    manifest_data: &mut ServiceManifestData,
    stdout: &mut StandardStream,
    dryrun: bool,
) -> Result<()> {
    let output_path = base_path.join(service_name);
    let template_dir = PathIO {
        input_path: Path::new("project")
            .join("service")
            .to_string_lossy()
            .to_string(),
        output_path: output_path.to_string_lossy().to_string(),
        module_id: None,
    };

    let ignore_files = vec![];
    let ignore_dirs = vec![];
    let preserve_files = vec![];
    let mut rendered_templates = generate_with_template(
        None,
        &template_dir,
        &ManifestData::Service(&manifest_data),
        &ignore_files,
        &ignore_dirs,
        &preserve_files,
        dryrun,
    )?;
    rendered_templates.push(generate_service_package_json(
        manifest_data,
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
        add_service_to_artifacts(manifest_data, base_path, app_root_path)
            .with_context(|| ERROR_FAILED_TO_ADD_SERVICE_METADATA_TO_ARTIFACTS)?,
    );
    rendered_templates.extend(
        add_base_entity_to_core(&ManifestData::Service(manifest_data), base_path)
            .with_context(|| ERROR_FAILED_TO_ADD_BASE_ENTITY_TO_CORE)?,
    );

    if manifest_data.is_in_memory_database {
        rendered_templates.push(RenderedTemplate {
            path: base_path.join("Dockerfile"),
            content: update_dockerfile_contents(
                &read_to_string(base_path.join("Dockerfile"))?,
                &manifest_data.runtime.parse()?,
                manifest_data.is_in_memory_database,
            )?,
            context: Some(ERROR_FAILED_TO_UPDATE_DOCKERFILE.to_string()),
        });
    }

    add_project_to_universal_sdk(
        &mut rendered_templates,
        base_path,
        &manifest_data.app_name,
        &manifest_data.service_name,
    )?;

    write_rendered_templates(&rendered_templates, dryrun, stdout)
        .with_context(|| ERROR_FAILED_TO_WRITE_SERVICE_FILES)?;

    generate_symlinks(
        Some(base_path),
        &Path::new(&template_dir.output_path),
        manifest_data,
        dryrun,
    )
    .with_context(|| ERROR_FAILED_TO_CREATE_SYMLINKS)?;

    Ok(())
}

fn add_service_to_artifacts(
    manifest_data: &mut ServiceManifestData,
    base_path: &Path,
    app_root_path: &Path,
) -> Result<Vec<RenderedTemplate>> {
    let docker_compose_buffer =
        add_service_definition_to_docker_compose(manifest_data, app_root_path, None)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;

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

    let runtime = manifest_data.runtime.parse()?;

    let mut package_json_buffer: Option<String> = None;
    let mut pnpm_workspace_buffer: Option<String> = None;

    match runtime {
        Runtime::Bun => {
            package_json_buffer = Some(
                add_project_definition_to_package_json(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?,
            );
        }
        Runtime::Node => {
            pnpm_workspace_buffer = Some(
                add_project_definition_to_pnpm_workspace(base_path, manifest_data)
                    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?,
            );
        }
    }

    let mut rendered_templates = Vec::new();

    let docker_compose_path = if let Some(docker_compose_path) = &manifest_data.docker_compose_path
    {
        app_root_path.join(docker_compose_path)
    } else {
        app_root_path.join("docker-compose.yaml")
    };

    rendered_templates.push(RenderedTemplate {
        path: docker_compose_path,
        content: docker_compose_buffer,
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE.to_string()),
    });

    rendered_templates.push(RenderedTemplate {
        path: app_root_path.join(".forklaunch").join("manifest.toml"),
        content: forklaunch_manifest_buffer.clone(),
        context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST.to_string()),
    });

    rendered_templates.push(
        update_application_package_json(
            &ManifestData::Service(manifest_data),
            base_path,
            package_json_buffer,
        )?
        .unwrap(),
    );

    if let Some(pnpm_workspace_buffer) = pnpm_workspace_buffer {
        rendered_templates.push(RenderedTemplate {
            path: base_path.join("pnpm-workspace.yaml"),
            content: pnpm_workspace_buffer,
            context: Some(ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE.to_string()),
        });
    }

    Ok(rendered_templates)
}

pub(crate) fn generate_service_package_json(
    manifest_data: &ServiceManifestData,
    base_path: &Path,
    dependencies_override: Option<ProjectDependencies>,
    dev_dependencies_override: Option<ProjectDevDependencies>,
    scripts_override: Option<ProjectScripts>,
    main_override: Option<String>,
) -> Result<RenderedTemplate> {
    let test_framework: Option<TestFramework> =
        if let Some(test_framework) = &manifest_data.test_framework {
            Some(test_framework.parse()?)
        } else {
            None
        };
    let package_json_contents = ProjectPackageJson {
        name: Some(format!(
            "@{}/{}",
            manifest_data.kebab_case_app_name, manifest_data.kebab_case_name
        )),
        version: Some("0.1.0".to_string()),
        r#type: Some("module".to_string()),
        description: Some(manifest_data.description.to_string()),
        keywords: Some(vec![]),
        license: Some(manifest_data.license.to_string()),
        author: Some(manifest_data.author.to_string()),
        main: main_override,
        types: None,
        scripts: Some(if let Some(scripts) = scripts_override {
            scripts
        } else {
            ProjectScripts {
                build: Some(PROJECT_BUILD_SCRIPT.to_string()),
                clean: Some(project_clean_script(&manifest_data.runtime.parse()?)),
                dev: Some(project_dev_server_script(
                    &manifest_data.runtime.parse()?,
                    manifest_data.database.parse::<Database>().ok(),
                )),
                dev_local: Some(project_dev_local_script(
                    &manifest_data.runtime.parse()?,
                    manifest_data.database.parse::<Database>().ok(),
                )),
                test: project_test_script(&manifest_data.runtime.parse()?, &test_framework),
                docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
                format: Some(project_format_script(&manifest_data.formatter.parse()?)),
                lint: Some(project_lint_script(&manifest_data.linter.parse()?)),
                lint_fix: Some(project_lint_fix_script(&manifest_data.linter.parse()?)),
                migrate_create: Some(project_migrate_script("create")),
                migrate_down: Some(project_migrate_script("down")),
                migrate_init: Some(project_migrate_script("init")),
                migrate_up: Some(project_migrate_script("up")),
                seed: Some(PROJECT_SEED_SCRIPT.to_string()),
                start: Some(project_start_server_script(
                    &manifest_data.runtime.parse()?,
                    manifest_data.database.parse::<Database>().ok(),
                )),
                ..Default::default()
            }
        }),
        dependencies: Some(if let Some(dependencies) = dependencies_override {
            dependencies
        } else {
            ProjectDependencies {
                app_name: manifest_data.app_name.to_string(),
                databases: HashSet::from([manifest_data.database.parse()?]),
                app_core: Some(APP_CORE_VERSION.to_string()),
                app_monitoring: Some(APP_MONITORING_VERSION.to_string()),
                forklaunch_better_auth_mikro_orm_fork: if manifest_data.is_better_auth {
                    Some(BETTER_AUTH_MIKRO_ORM_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_common: Some(COMMON_VERSION.to_string()),
                forklaunch_core: Some(CORE_VERSION.to_string()),
                forklaunch_express: if manifest_data.is_express {
                    Some(EXPRESS_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_hyper_express: if manifest_data.is_hyper_express {
                    Some(HYPER_EXPRESS_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_implementation_billing_base: if manifest_data.is_billing {
                    Some(BILLING_BASE_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_implementation_billing_stripe: if manifest_data.is_stripe {
                    Some(BILLING_STRIPE_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_interfaces_billing: if manifest_data.is_billing {
                    Some(BILLING_INTERFACES_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_implementation_iam_base: if manifest_data.is_iam {
                    Some(IAM_BASE_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_infrastructure_redis: if manifest_data.is_cache_enabled {
                    Some(INFRASTRUCTURE_REDIS_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_infrastructure_s3: if manifest_data.is_s3_enabled {
                    Some(INFRASTRUCTURE_S3_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_interfaces_iam: if manifest_data.service_name == "iam" {
                    Some(IAM_INTERFACES_VERSION.to_string())
                } else {
                    None
                },
                forklaunch_implementation_worker_bullmq: None,
                forklaunch_implementation_worker_database: None,
                forklaunch_implementation_worker_kafka: None,
                forklaunch_implementation_worker_redis: None,
                forklaunch_interfaces_worker: None,
                forklaunch_internal: Some(INTERNAL_VERSION.to_string()),
                forklaunch_universal_sdk: None,
                forklaunch_validator: Some(VALIDATOR_VERSION.to_string()),
                mikro_orm_core: Some(MIKRO_ORM_CORE_VERSION.to_string()),
                mikro_orm_migrations: Some(MIKRO_ORM_MIGRATIONS_VERSION.to_string()),
                mikro_orm_database: Some(MIKRO_ORM_DATABASE_VERSION.to_string()),
                mikro_orm_reflection: Some(MIKRO_ORM_REFLECTION_VERSION.to_string()),
                mikro_orm_seeder: Some(MIKRO_ORM_SEEDER_VERSION.to_string()),
                opentelemetry_api: if manifest_data.is_better_auth {
                    Some(OPENTELEMETRY_API_VERSION.to_string())
                } else {
                    None
                },
                typebox: if manifest_data.is_typebox {
                    Some(TYPEBOX_VERSION.to_string())
                } else {
                    None
                },
                ajv: Some(AJV_VERSION.to_string()),
                better_auth: if manifest_data.is_better_auth {
                    Some(BETTER_AUTH_VERSION.to_string())
                } else {
                    None
                },
                bullmq: None,
                better_sqlite3: if manifest_data.is_node
                    && manifest_data.is_database_enabled
                    && manifest_data.is_better_sqlite
                {
                    Some(BETTER_SQLITE3_VERSION.to_string())
                } else {
                    None
                },
                dotenv: Some(DOTENV_VERSION.to_string()),
                sqlite3: if manifest_data.is_node
                    && manifest_data.is_database_enabled
                    && manifest_data.is_sqlite
                {
                    Some(SQLITE3_VERSION.to_string())
                } else {
                    None
                },
                stripe: if manifest_data.is_stripe {
                    Some(STRIPE_VERSION.to_string())
                } else {
                    None
                },
                uuid: Some(UUID_VERSION.to_string()),
                zod: if manifest_data.is_zod {
                    Some(ZOD_VERSION.to_string())
                } else {
                    None
                },
                additional_deps: HashMap::new(),
            }
        }),
        dev_dependencies: Some(if let Some(dev_dependencies) = dev_dependencies_override {
            dev_dependencies
        } else {
            ProjectDevDependencies {
                biome: if manifest_data.is_biome {
                    Some(BIOME_VERSION.to_string())
                } else {
                    None
                },
                eslint: if manifest_data.is_eslint {
                    Some(ESLINT_VERSION.to_string())
                } else {
                    None
                },
                eslint_js: if manifest_data.is_eslint {
                    Some(ESLINT_VERSION.to_string())
                } else {
                    None
                },
                mikro_orm_cli: Some(MIKRO_ORM_CLI_VERSION.to_string()),
                oxlint: if manifest_data.is_oxlint {
                    Some(OXLINT_VERSION.to_string())
                } else {
                    None
                },
                prettier: if manifest_data.is_prettier {
                    Some(PRETTIER_VERSION.to_string())
                } else {
                    None
                },
                tsx: Some(TSX_VERSION.to_string()),
                typedoc: Some(TYPEDOC_VERSION.to_string()),
                typescript_eslint: Some(TYPESCRIPT_ESLINT_VERSION.to_string()),
                types_uuid: Some(TYPES_UUID_VERSION.to_string()),
                types_express: Some(TYPES_EXPRESS_VERSION.to_string()),
                types_express_serve_static_core: Some(
                    TYPES_EXPRESS_SERVE_STATIC_CORE_VERSION.to_string(),
                ),
                types_qs: Some(TYPES_QS_VERSION.to_string()),
                additional_deps: HashMap::new(),
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
        additional_entries: HashMap::new(),
    };
    Ok(RenderedTemplate {
        path: base_path.join("package.json"),
        content: to_string_pretty(&package_json_contents)?,
        context: Some(ERROR_FAILED_TO_CREATE_PACKAGE_JSON.to_string()),
    })
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
        command("service", "Initialize a new service")
            .alias("svc")
            .alias("project")
            .alias("proj")
            .arg(Arg::new("name").help("The name of the service"))
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The path to initialize the service in"),
            )
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use")
                    .value_parser(Database::VARIANTS),
            )
            .arg(
                Arg::new("infrastructure")
                    .short('i')
                    .long("infrastructure")
                    .help("Add optional infrastructure to the service")
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
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Service,
            &BasePathType::Init,
        )?;
        let base_path = Path::new(&base_path_input);
        let manifest_path_config = create_module_config();
        let manifest_path = find_manifest_path(&base_path, &manifest_path_config);

        let config_path = if let Some(manifest) = manifest_path {
            manifest
        } else {
            // No manifest found, this might be an error or we need to search more broadly
            anyhow::bail!(
                "Could not find .forklaunch/manifest.toml. Make sure you're in a valid project directory or specify the correct base_path."
            );
        };
        let app_root_path: PathBuf = config_path
            .to_string_lossy()
            .strip_suffix(".forklaunch/manifest.toml")
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Expected manifest path to end with .forklaunch/manifest.toml, got: {:?}",
                    config_path
                )
            })?
            .to_string()
            .into();

        let existing_manifest_data = from_str::<ApplicationManifestData>(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        existing_manifest_data.initialize(InitializableManifestConfigMetadata::Application(
            ApplicationInitializationMetadata {
                app_name: existing_manifest_data.app_name.clone(),
                database: None,
            },
        ));

        let service_name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "service name",
            None,
            |input: &str| validate_name(input) && !existing_manifest_data.app_name.contains(input),
            |_| {
                "Service name cannot be a substring of the application name, empty or include numbers or spaces. Please try again"
                    .to_string()
            },
        )?;

        let database: Database = prompt_with_validation(
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

        let infrastructure: Vec<Infrastructure> = if matches.ids().all(|id| id == "dryrun") {
            prompt_comma_separated_list(
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
            .collect()
        } else {
            vec![]
        };

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "service description (optional)",
            None,
        )?;

        let mut manifest_data: ServiceManifestData = ServiceManifestData {
            // Common fields from ApplicationManifestData
            id: existing_manifest_data.id.clone(),
            app_name: existing_manifest_data.app_name.clone(),
            modules_path: existing_manifest_data.modules_path.clone(),
            docker_compose_path: existing_manifest_data.docker_compose_path.clone(),
            camel_case_app_name: existing_manifest_data.camel_case_app_name.clone(),
            pascal_case_app_name: existing_manifest_data.pascal_case_app_name.clone(),
            kebab_case_app_name: existing_manifest_data.kebab_case_app_name.clone(),
            app_description: existing_manifest_data.app_description.clone(),
            author: existing_manifest_data.author.clone(),
            cli_version: existing_manifest_data.cli_version.clone(),
            formatter: existing_manifest_data.formatter.clone(),
            linter: existing_manifest_data.linter.clone(),
            validator: existing_manifest_data.validator.clone(),
            runtime: existing_manifest_data.runtime.clone(),
            test_framework: existing_manifest_data.test_framework.clone(),
            projects: existing_manifest_data.projects.clone(),
            http_framework: existing_manifest_data.http_framework.clone(),
            license: existing_manifest_data.license.clone(),
            project_peer_topology: existing_manifest_data.project_peer_topology.clone(),
            is_biome: existing_manifest_data.is_biome,
            is_eslint: existing_manifest_data.is_eslint,
            is_oxlint: existing_manifest_data.is_oxlint,
            is_prettier: existing_manifest_data.is_prettier,
            is_express: existing_manifest_data.is_express,
            is_hyper_express: existing_manifest_data.is_hyper_express,
            is_zod: existing_manifest_data.is_zod,
            is_typebox: existing_manifest_data.is_typebox,
            is_bun: existing_manifest_data.is_bun,
            is_node: existing_manifest_data.is_node,
            is_vitest: existing_manifest_data.is_vitest,
            is_jest: existing_manifest_data.is_jest,

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

        let dryrun = matches.get_flag("dryrun");
        generate_basic_service(
            &service_name,
            &base_path,
            &app_root_path,
            &mut manifest_data,
            &mut stdout,
            dryrun,
        )
        .with_context(|| "Failed to create service")?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "{} initialized successfully!", service_name)?;
            stdout.reset()?;
            format_code(&base_path, &manifest_data.runtime.parse()?);
        }

        Ok(())
    }
}
