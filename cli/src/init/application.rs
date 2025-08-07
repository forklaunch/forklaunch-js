use std::{
    collections::{HashMap, HashSet},
    env,
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::to_string_pretty;
use serde_yml::to_string;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use uuid::Uuid;

use super::service::generate_service_package_json;
use crate::{
    CliCommand,
    constants::{
        Database, ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS,
        ERROR_FAILED_TO_CREATE_GITIGNORE, ERROR_FAILED_TO_CREATE_LICENSE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE, ERROR_FAILED_TO_SETUP_IAM, Formatter,
        HttpFramework, License, Linter, Module, Runtime, TestFramework, Validator,
        get_core_module_description, get_monitoring_module_description, get_service_module_cache,
        get_service_module_description, get_service_module_name,
        get_universal_sdk_module_description,
    },
    core::{
        command::command,
        database::{
            generate_index_ts_database_export, get_database_port, get_database_variants,
            get_db_driver, get_postinstall_script, is_in_memory_database,
        },
        docker::{
            DockerCompose, add_otel_to_docker_compose, add_service_definition_to_docker_compose,
        },
        format::format_code,
        gitignore::generate_gitignore,
        iam::generate_iam_keys,
        license::generate_license,
        manifest::{
            ManifestData, ProjectEntry, ProjectType, ResourceInventory,
            application::ApplicationManifestData, generate_manifest, service::ServiceManifestData,
        },
        modules::{IamConfig, ModuleConfig, validate_modules},
        name::validate_name,
        package_json::{
            application_package_json::{
                ApplicationDevDependencies, ApplicationPackageJson, ApplicationPnpm,
                ApplicationScripts,
            },
            package_json_constants::{
                AJV_VERSION, APP_DEV_BUILD_SCRIPT, APP_DEV_SCRIPT, APP_PREPARE_SCRIPT,
                BETTER_AUTH_VERSION, BETTER_SQLITE3_VERSION, BIOME_VERSION, COMMON_VERSION,
                CORE_VERSION, DOTENV_VERSION, ESLINT_VERSION, EXPRESS_VERSION, GLOBALS_VERSION,
                HUSKY_VERSION, HYPER_EXPRESS_VERSION, JEST_TYPES_VERSION, JEST_VERSION,
                LINT_STAGED_VERSION, MIKRO_ORM_CORE_VERSION, MIKRO_ORM_DATABASE_VERSION,
                MIKRO_ORM_MIGRATIONS_VERSION, MIKRO_ORM_REFLECTION_VERSION, NODE_GYP_VERSION,
                OXLINT_VERSION, PRETTIER_VERSION, PROJECT_BUILD_SCRIPT, PROJECT_DOCS_SCRIPT,
                SORT_PACKAGE_JSON_VERSION, SQLITE3_VERSION, TS_JEST_VERSION, TS_NODE_VERSION,
                TSX_VERSION, TYPEBOX_VERSION, TYPES_EXPRESS_SERVE_STATIC_CORE_VERSION,
                TYPES_EXPRESS_VERSION, TYPES_QS_VERSION, TYPES_UUID_VERSION,
                TYPESCRIPT_ESLINT_VERSION, TYPESCRIPT_VERSION, UNIVERSAL_SDK_VERSION, UUID_VERSION,
                VALIDATOR_VERSION, VITEST_VERSION, ZOD_VERSION, application_build_script,
                application_clean_purge_script, application_clean_script, application_docs_script,
                application_format_script, application_lint_fix_script, application_lint_script,
                application_migrate_script, application_seed_script, application_setup_script,
                application_test_script, application_up_packages_script, project_clean_script,
                project_format_script, project_lint_fix_script, project_lint_script,
                project_test_script,
            },
            project_package_json::{ProjectDependencies, ProjectDevDependencies, ProjectScripts},
        },
        pnpm_workspace::generate_pnpm_workspace,
        rendered_template::{RenderedTemplate, create_forklaunch_dir, write_rendered_templates},
        symlinks::generate_symlinks,
        template::{PathIO, generate_with_template, get_routers_from_standard_package},
        token::get_token,
        universal_sdk::get_universal_sdk_additional_deps,
    },
    prompt::{
        ArrayCompleter, prompt_comma_separated_list, prompt_with_validation,
        prompt_without_validation, prompt_for_confirmation,
    },
};

fn generate_application_package_json(
    data: &ApplicationManifestData,
    bun_workspace_projects: Option<Vec<String>>,
) -> Result<RenderedTemplate> {
    let test_framework: Option<TestFramework> = if let Some(test_framework) = &data.test_framework {
        Some(test_framework.parse()?)
    } else {
        None
    };
    let package_json_contents = ApplicationPackageJson {
        name: Some(data.kebab_case_app_name.clone()),
        version: Some("0.0.1".to_string()),
        description: Some(data.app_description.clone()),
        keywords: Some(vec![]),
        license: Some(data.license.clone()),
        author: Some(data.author.clone()),
        workspaces: bun_workspace_projects,
        scripts: Some(ApplicationScripts {
            build: Some(application_build_script(
                &data.runtime.parse()?,
                &data.kebab_case_app_name,
            )),
            clean: Some(application_clean_script(&data.runtime.parse()?)),
            clean_purge: Some(application_clean_purge_script(&data.runtime.parse()?)),
            database_setup: Some(application_setup_script(&data.runtime.parse()?)),
            dev: Some(APP_DEV_SCRIPT.to_string()),
            dev_build: Some(APP_DEV_BUILD_SCRIPT.to_string()),
            docs: Some(application_docs_script(&data.runtime.parse()?)),
            format: Some(application_format_script(&data.formatter.parse()?)),
            lint: Some(application_lint_script(&data.linter.parse()?)),
            lint_fix: Some(application_lint_fix_script(&data.linter.parse()?)),
            migrate_create: Some(application_migrate_script(
                &data.runtime.parse()?,
                &HashSet::from([data.database.parse()?]),
                "create",
            )),
            migrate_down: Some(application_migrate_script(
                &data.runtime.parse()?,
                &HashSet::from([data.database.parse()?]),
                "down",
            )),
            migrate_init: Some(application_migrate_script(
                &data.runtime.parse()?,
                &HashSet::from([data.database.parse()?]),
                "init",
            )),
            migrate_up: Some(application_migrate_script(
                &data.runtime.parse()?,
                &HashSet::from([data.database.parse()?]),
                "up",
            )),
            postinstall: get_postinstall_script(&data.database.parse()?),
            prepare: Some(APP_PREPARE_SCRIPT.to_string()),
            seed: Some(application_seed_script(
                &data.runtime.parse()?,
                &HashSet::from([data.database.parse()?]),
            )),
            test: application_test_script(&data.runtime.parse()?, &test_framework),
            up_packages: Some(application_up_packages_script(&data.runtime.parse()?)),
            additional_scripts: HashMap::new(),
        }),
        dev_dependencies: Some(ApplicationDevDependencies {
            biome: if data.is_biome {
                Some(BIOME_VERSION.to_string())
            } else {
                None
            },
            eslint_js: if data.is_eslint {
                Some(ESLINT_VERSION.to_string())
            } else {
                None
            },
            eslint: if data.is_eslint {
                Some(ESLINT_VERSION.to_string())
            } else {
                None
            },
            oxlint: if data.is_oxlint {
                Some(OXLINT_VERSION.to_string())
            } else {
                None
            },
            prettier: if data.is_prettier {
                Some(PRETTIER_VERSION.to_string())
            } else {
                None
            },
            types_jest: if data.is_jest {
                Some(JEST_TYPES_VERSION.to_string())
            } else {
                None
            },
            better_sqlite3: if data.is_node && (data.is_sqlite || data.is_better_sqlite) {
                Some(BETTER_SQLITE3_VERSION.to_string())
            } else {
                None
            },
            globals: Some(GLOBALS_VERSION.to_string()),
            husky: Some(HUSKY_VERSION.to_string()),
            jest: if data.is_jest {
                Some(JEST_VERSION.to_string())
            } else {
                None
            },
            lint_staged: Some(LINT_STAGED_VERSION.to_string()),
            node_gyp: if data.is_node && (data.is_sqlite || data.is_better_sqlite) {
                Some(NODE_GYP_VERSION.to_string())
            } else {
                None
            },
            sqlite3: if data.is_node && data.is_sqlite {
                Some(SQLITE3_VERSION.to_string())
            } else {
                None
            },
            sort_package_json: Some(SORT_PACKAGE_JSON_VERSION.to_string()),
            ts_jest: if data.is_jest {
                Some(TS_JEST_VERSION.to_string())
            } else {
                None
            },
            ts_node: Some(TS_NODE_VERSION.to_string()),
            tsx: Some(TSX_VERSION.to_string()),
            typescript: Some(TYPESCRIPT_VERSION.to_string()),
            typescript_eslint: if data.is_eslint {
                Some(TYPESCRIPT_ESLINT_VERSION.to_string())
            } else {
                None
            },
            vitest: if data.is_vitest {
                Some(VITEST_VERSION.to_string())
            } else {
                None
            },
            additional_deps: HashMap::new(),
        }),
        pnpm: if data.is_node {
            Some(ApplicationPnpm {
                // TODO: Remove -- temporary patches for MikroORM CLI
                patched_dependencies: Some(HashMap::from([(
                    "@jercle/yargonaut".to_string(),
                    "./patches/@jercle__yargonaut.patch".to_string(),
                )])),
            })
        } else {
            None
        },
        patched_dependencies: if data.is_bun {
            Some(HashMap::from([(
                "@jercle/yargonaut@1.1.5".to_string(),
                "./patches/@jercle__yargonaut.patch".to_string(),
            )]))
        } else {
            None
        },
        additional_entries: HashMap::new(),
    };

    Ok(RenderedTemplate {
        path: Path::new(&data.application_path).join("package.json"),
        content: to_string_pretty(&package_json_contents).unwrap(),
        context: None,
    })
}

#[derive(Debug)]
pub(super) struct ApplicationCommand;

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ApplicationCommand {
    fn command(&self) -> Command {
        command("application", "Initialize a new full monorepo application")
            .alias("app")
            .arg(Arg::new("name").help("The name of the application"))
            .arg(
                Arg::new("path")
                .short('p')
                .long("path")
                .help("Project path (optional, will prompt if not provided)"),
            )
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use")
                    .value_parser(Database::VARIANTS),
            )
            .arg(
                Arg::new("validator")
                    .short('v')
                    .long("validator")
                    .help("The validator to use")
                    .value_parser(Validator::VARIANTS),
            )
            .arg(
                Arg::new("formatter")
                    .short('f')
                    .long("formatter")
                    .help("The formatter to use")
                    .value_parser(Formatter::VARIANTS),
            )
            .arg(
                Arg::new("linter")
                    .short('l')
                    .long("linter")
                    .help("The linter to use")
                    .value_parser(Linter::VARIANTS),
            )
            .arg(
                Arg::new("http-framework")
                    .short('F')
                    .long("http-framework")
                    .help("The framework to use")
                    .value_parser(HttpFramework::VARIANTS),
            )
            .arg(
                Arg::new("runtime")
                    .short('r')
                    .long("runtime")
                    .help("The runtime to use")
                    .value_parser(Runtime::VARIANTS),
            )
            .arg(
                Arg::new("test-framework")
                    .short('t')
                    .long("test-framework")
                    .help("The test framework to use")
                    .value_parser(TestFramework::VARIANTS),
            )
            .arg(
                Arg::new("modules")
                    .short('m')
                    .long("modules")
                    .help("Additional modules to include")
                    .value_parser(Module::VARIANTS)
                    .num_args(0..)
                    .action(ArgAction::Append),
            )
            // .arg(
            //     Arg::new("libraries")
            //         .short('l')
            //         .long("libraries")
            //         .help("Additional libraries to include.]")
            //         .value_parser(VALID_LIBRARIES)
            //         .num_args(0..)
            //         .action(ArgAction::Append),
            // )
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the application"),
            )
            .arg(
                Arg::new("author")
                    .short('A')
                    .long("author")
                    .help("The author of the application"),
            )
            .arg(
                Arg::new("license")
                    .short('L')
                    .long("license")
                    .help("The license of the application")
                    .value_parser(License::VARIANTS),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the application")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        // TODO: Include basic token checks (expiration, permissions mapping) in this method, but retrieve token from parent command
        let _token = get_token()?;

        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let name = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "name",
            matches,
            "application name",
            None,
            |input: &str| validate_name(input),
            |_| {
                "Application name cannot be empty or include numbers or spaces. Please try again"
                    .to_string()
            },
        )?;

        // Check if path argument is provided
        let application_path = if let Some(custom_path) = matches.get_one::<String>("path") {
            // Use the provided path directly
            custom_path.clone()
        } else {
            // Use interactive prompts as before
            let use_cwd = prompt_for_confirmation(
            &mut line_editor,
            "Would you like to use the current directory for project files? (y/n) ",
        )?;

        if !use_cwd {
                prompt_with_validation(
                    &mut line_editor,
                    &mut stdout,
                    "application_path",
                    matches,
                    "Please provide path to project directory:",
                    None,
                    |input: &str| {
                        // Validate that the path is not empty and doesn't contain invalid characters
                        !input.trim().is_empty() && !input.contains('\0')
                    },
                    |_| "Project path cannot be empty or contain null characters. Please try again".to_string(),
                )?
            } else {
                // Use current working directory
                std::env::current_dir()
                    .with_context(|| "Failed to get current working directory")?
                    .to_string_lossy()
                    .to_string()
            }
        };

        // Combine the project path with the application name
        let full_application_path = if application_path.ends_with('/') || application_path.ends_with('\\') {
            format!("{}{}", application_path, name)
        } else {
            format!("{}/{}", application_path, name)
        };

        let runtime: Runtime = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "runtime",
            matches,
            "runtime",
            Some(&crate::constants::Runtime::VARIANTS),
            |input| Runtime::VARIANTS.contains(&input),
            |_| "Invalid runtime. Please try again".to_string(),
        )?
        .parse()?;

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

        let validator: Validator = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "validator",
            matches,
            "validator",
            Some(&Validator::VARIANTS),
            |input| Validator::VARIANTS.contains(&input),
            |_| "Invalid validator type. Please try again".to_string(),
        )?
        .parse()?;

        let formatter: Formatter = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "formatter",
            matches,
            "formatter",
            Some(&Formatter::VARIANTS),
            |input| Formatter::VARIANTS.contains(&input),
            |_| "Invalid formatter type. Please try again".to_string(),
        )?
        .parse()?;

        let linter: Linter = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "linter",
            matches,
            "linter",
            Some(&Linter::VARIANTS),
            |input| Linter::VARIANTS.contains(&input),
            |_| "Invalid linter type. Please try again".to_string(),
        )?
        .parse()?;

        let http_framework: HttpFramework = if runtime == Runtime::Bun {
            if let Some(command_line_http_framework) = matches.get_one::<String>("http_framework") {
                if command_line_http_framework
                    .clone()
                    .parse::<HttpFramework>()?
                    == HttpFramework::HyperExpress
                {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                    writeln!(
                        stdout,
                        "Incompatible choices: Bun + hyper-express, defaulting to Bun + express.",
                    )?;
                    stdout.reset()?;
                }
            }
            HttpFramework::Express
        } else {
            prompt_with_validation(
                &mut line_editor,
                &mut stdout,
                "http-framework",
                matches,
                "HTTP framework",
                Some(&HttpFramework::VARIANTS),
                |input| HttpFramework::VARIANTS.contains(&input),
                |_| "Invalid HTTP framework. Please try again".to_string(),
            )?
            .parse()?
        };

        let test_framework: Option<TestFramework> = if runtime == Runtime::Bun {
            if matches.get_one::<String>("test-framework").is_some() {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(
                    stdout,
                    "Ignoring test-framework choice, defaulting to Bun built-in test runner.",
                )?;
                stdout.reset()?;
            }
            None
        } else {
            Some(
                prompt_with_validation(
                    &mut line_editor,
                    &mut stdout,
                    "test-framework",
                    matches,
                    "test framework",
                    Some(&TestFramework::VARIANTS),
                    |input| TestFramework::VARIANTS.contains(&input),
                    |_| "Invalid test framework. Please try again".to_string(),
                )?
                .parse()?,
            )
        };

        let mut global_module_config = ModuleConfig {
            iam: None,
            billing: None,
        };
        let modules: Vec<Module> = if matches.ids().all(|id| id == "dryrun") {
            let mut modules_to_test;
            loop {
                global_module_config = ModuleConfig {
                    iam: None,
                    billing: None,
                };
                modules_to_test = prompt_comma_separated_list(
                    &mut line_editor,
                    "modules",
                    matches,
                    &Module::VARIANTS,
                    None,
                    "modules",
                    false,
                )?
                .iter()
                .map(|module| module.parse().unwrap())
                .collect();

                if validate_modules(&modules_to_test, &mut global_module_config).is_ok() {
                    break;
                }
            }
            modules_to_test
        } else {
            let modules_to_test = match matches.get_many::<String>("modules") {
                Some(values) => values.map(|module| module.parse().unwrap()).collect(),
                None => vec![],
            };
            validate_modules(&modules_to_test, &mut global_module_config)?;
            modules_to_test
        };

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "project description (optional)",
            None,
        )?;

        let author = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "author",
            matches,
            "author name",
            None,
            |input: &str| !input.is_empty(),
            |_| "Author name cannot be empty. Please try again".to_string(),
        )?;

        let license: License = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "license",
            matches,
            "license",
            Some(&License::VARIANTS),
            |input: &str| License::VARIANTS.contains(&input),
            |_| "Invalid license. Please try again".to_string(),
        )?
        .parse()?;

        // TODO: Add support for libraries

        let dryrun = matches.get_flag("dryrun");
        let mut ignore_files = vec!["pnpm-workspace.yaml", "pnpm-lock.yml"];
        let ignore_dirs = vec![];
        let preserve_files = vec!["application-overview.json"];

        ignore_files.extend(formatter.all_other_files());
        ignore_files.extend(linter.all_other_files());
        if test_framework.is_some() {
            ignore_files.extend(test_framework.unwrap().all_other_files());
        }
        ignore_files.extend(database.all_other_files());

        // Inline specific perms checks here. Make remote calls to receive templates for specific services if needed here (premium only).

        let mut additional_projects = vec![
            ProjectEntry {
                r#type: ProjectType::Library,
                name: "core".to_string(),
                description: get_core_module_description(&name),
                variant: None,
                resources: None,
                routers: None,
                metadata: None,
            },
            ProjectEntry {
                r#type: ProjectType::Library,
                name: "monitoring".to_string(),
                description: get_monitoring_module_description(&name),
                variant: None,
                resources: None,
                routers: None,
                metadata: None,
            },
            ProjectEntry {
                r#type: ProjectType::Library,
                name: "universal-sdk".to_string(),
                description: get_universal_sdk_module_description(&name),
                variant: None,
                resources: None,
                routers: None,
                metadata: None,
            },
        ];
        additional_projects.extend(modules.clone().into_iter().map(|package| ProjectEntry {
            r#type: ProjectType::Service,
            name: get_service_module_name(&package),
            description: get_service_module_description(&name, &package),
            variant: Some(package.to_string()),
            resources: Some(ResourceInventory {
                database: Some(database.to_string()),
                cache: get_service_module_cache(&package),
                queue: None,
                object_store: None,
            }),
            routers: get_routers_from_standard_package(package),
            metadata: None,
        }));

        let additional_projects_names = additional_projects
            .clone()
            .into_iter()
            .map(|p| p.name.clone())
            .collect::<Vec<String>>();

        let mut project_peer_topology = HashMap::new();
        project_peer_topology.insert(name.to_string(), additional_projects_names.clone());

        let bun_package_json_workspace_vec = match runtime {
            Runtime::Bun => Some(additional_projects_names.clone()),
            _ => None,
        };

        let mut data = ApplicationManifestData {
            id: Uuid::new_v4().to_string(),
            cli_version: env!("CARGO_PKG_VERSION").to_string(),
            application_path: full_application_path.clone(),
            database: database.to_string(),
            app_name: name.to_string(),
            camel_case_app_name: name.to_string().to_case(Case::Camel),
            pascal_case_app_name: name.to_string().to_case(Case::Pascal),
            kebab_case_app_name: name.to_string().to_case(Case::Kebab),
            formatter: formatter.to_string(),
            linter: linter.to_string(),
            validator: validator.to_string(),
            http_framework: match http_framework {
                HttpFramework::Express => "express".to_string(),
                HttpFramework::HyperExpress => "hyper-express".to_string(),
            },
            runtime: runtime.to_string(),
            test_framework: if let Some(test_framework_variant) = test_framework.clone() {
                Some(test_framework_variant.to_string())
            } else {
                None
            },
            projects: additional_projects.clone(),
            project_peer_topology,
            app_description: description.to_string(),
            author: author.to_string(),
            license: license.to_string(),

            is_eslint: linter == Linter::Eslint,
            is_oxlint: linter == Linter::Oxlint,
            is_biome: formatter == Formatter::Biome,
            is_prettier: formatter == Formatter::Prettier,
            is_express: http_framework == HttpFramework::Express,
            is_hyper_express: http_framework == HttpFramework::HyperExpress,
            is_zod: validator == Validator::Zod,
            is_typebox: validator == Validator::Typebox,
            is_bun: runtime == Runtime::Bun,
            is_node: runtime == Runtime::Node,
            is_vitest: test_framework == Some(TestFramework::Vitest),
            is_jest: test_framework == Some(TestFramework::Jest),

            is_postgres: database == Database::PostgreSQL,
            is_sqlite: database == Database::SQLite,
            is_mysql: database == Database::MySQL,
            is_mariadb: database == Database::MariaDB,
            is_better_sqlite: database == Database::BetterSQLite,
            is_libsql: database == Database::LibSQL,
            is_mssql: database == Database::MsSQL,
            is_mongo: database == Database::MongoDB,
            is_in_memory_database: is_in_memory_database(&database),
        };

        let mut rendered_templates = Vec::new();

        rendered_templates.extend(
            generate_manifest(&Path::new(&full_application_path).to_string_lossy().to_string(), &data)
                .with_context(|| "Failed to setup manifest file for application")?,
        );

        // TODO: support different path delimiters
        let mut template_dirs = vec![];

        let additional_projects_dirs = additional_projects.clone().into_iter().map(|path| {
            let (module_id, path_id) = if path.variant.is_some() {
                (
                    Some(path.variant.clone().unwrap().parse::<Module>().unwrap()),
                    path.variant.clone().unwrap(),
                )
            } else {
                (None, path.name.clone())
            };

            PathIO {
                module_id,
                input_path: Path::new("project")
                    .join(path_id.clone())
                    .to_string_lossy()
                    .to_string(),
                output_path: path.name,
            }
        });

        template_dirs.extend(additional_projects_dirs.clone());

        rendered_templates.extend(generate_with_template(
            Some(&full_application_path),
            &PathIO {
                input_path: Path::new("application").to_string_lossy().to_string(),
                output_path: "".to_string(),
                module_id: None,
            },
            &ManifestData::Application(&data),
            &ignore_files
                .iter()
                .map(|ignore_file| ignore_file.to_string())
                .collect::<Vec<String>>(),
            &ignore_dirs,
            &preserve_files
                .iter()
                .map(|preserve_file| preserve_file.to_string())
                .collect::<Vec<String>>(),
            dryrun,
        )?);

        // TODO: think about refactoring this to use pure docker compose and instead use a deserialization function elsewhere
        let mut docker_compose_string = Some(
            to_string(add_otel_to_docker_compose(
                &name,
                &mut DockerCompose::default(),
            )?)
            .unwrap(),
        );
        for template_dir in template_dirs {
            let mut service_data = ServiceManifestData {
                id: data.id.clone(),
                cli_version: data.cli_version.clone(),
                app_name: data.app_name.clone(),
                camel_case_app_name: data.camel_case_app_name.clone(),
                pascal_case_app_name: data.pascal_case_app_name.clone(),
                kebab_case_app_name: data.kebab_case_app_name.clone(),
                service_name: template_dir.output_path.to_string(),
                camel_case_name: template_dir.output_path.to_case(Case::Camel),
                pascal_case_name: template_dir.output_path.to_case(Case::Pascal),
                kebab_case_name: template_dir.output_path.to_case(Case::Kebab),
                formatter: data.formatter.clone(),
                linter: data.linter.clone(),
                validator: data.validator.clone(),
                http_framework: data.http_framework.clone(),
                runtime: data.runtime.clone(),
                test_framework: data.test_framework.clone(),
                projects: data.projects.clone(),
                project_peer_topology: data.project_peer_topology.clone(),
                author: data.author.clone(),
                app_description: data.app_description.clone(),
                license: data.license.clone(),
                description: match template_dir.output_path.as_str() {
                    "core" => get_core_module_description(&name),
                    "monitoring" => get_monitoring_module_description(&name),
                    "universal-sdk" => get_universal_sdk_module_description(&name),
                    _ => get_service_module_description(
                        &name,
                        &template_dir.module_id.clone().unwrap(),
                    ),
                },

                is_eslint: data.is_eslint,
                is_biome: data.is_biome,
                is_oxlint: data.is_oxlint,
                is_prettier: data.is_prettier,
                is_express: data.is_express,
                is_hyper_express: data.is_hyper_express,
                is_zod: data.is_zod,
                is_typebox: data.is_typebox,
                is_bun: data.is_bun,
                is_node: data.is_node,
                is_vitest: data.is_vitest,
                is_jest: data.is_jest,

                is_postgres: data.is_postgres,
                is_sqlite: data.is_sqlite,
                is_mysql: data.is_mysql,
                is_mariadb: data.is_mariadb,
                is_better_sqlite: data.is_better_sqlite,
                is_libsql: data.is_libsql,
                is_mssql: data.is_mssql,
                is_mongo: data.is_mongo,
                is_in_memory_database: data.is_in_memory_database,

                database: data.database.clone(),
                database_port: get_database_port(&data.database.parse()?),
                db_driver: get_db_driver(&data.database.parse()?),

                is_iam: template_dir.module_id == Some(Module::BaseIam)
                    || template_dir.module_id == Some(Module::BetterAuthIam),
                is_billing: template_dir.module_id == Some(Module::BaseBilling)
                    || template_dir.module_id == Some(Module::StripeBilling),
                is_cache_enabled: template_dir.module_id == Some(Module::BaseBilling)
                    || template_dir.module_id == Some(Module::StripeBilling),
                is_s3_enabled: false,
                is_database_enabled: true,

                is_better_auth: template_dir.module_id == Some(Module::BetterAuthIam),
                is_stripe: template_dir.module_id == Some(Module::StripeBilling),
            };

            if service_data.service_name == "universal-sdk" {
                service_data.is_iam = global_module_config.iam.is_some();
                service_data.is_billing = global_module_config.billing.is_some();
            }

            if !HashSet::from([
                "core".to_string(),
                "monitoring".to_string(),
                "universal-sdk".to_string(),
            ])
            .contains(&service_data.service_name)
            {
                docker_compose_string = Some(add_service_definition_to_docker_compose(
                    &service_data,
                    &Path::new(&full_application_path),
                    docker_compose_string,
                )?);
            }

            rendered_templates.extend(generate_with_template(
                Some(&full_application_path),
                &template_dir,
                &ManifestData::Service(&service_data),
                &ignore_files
                    .iter()
                    .map(|ignore_file| ignore_file.to_string())
                    .collect::<Vec<String>>(),
                &ignore_dirs,
                &preserve_files
                    .iter()
                    .map(|preserve_file| preserve_file.to_string())
                    .collect::<Vec<String>>(),
                dryrun,
            )?);

            let test_framework: Option<TestFramework> =
                if let Some(test_framework) = &data.test_framework {
                    Some(test_framework.parse()?)
                } else {
                    None
                };

            let service_base_path = Path::new(&full_application_path).join(&template_dir.output_path);
            rendered_templates.push(generate_service_package_json(
                &service_data,
                &service_base_path,
                match service_data.service_name.as_str() {
                    "core" => Some(ProjectDependencies {
                        app_name: service_data.app_name.clone(),
                        databases: HashSet::from([service_data.database.parse()?]),
                        forklaunch_better_auth_mikro_orm_fork: None,
                        forklaunch_common: Some(COMMON_VERSION.to_string()),
                        forklaunch_core: Some(CORE_VERSION.to_string()),
                        forklaunch_express: if service_data.is_express {
                            Some(EXPRESS_VERSION.to_string())
                        } else {
                            None
                        },
                        forklaunch_hyper_express: if service_data.is_hyper_express {
                            Some(HYPER_EXPRESS_VERSION.to_string())
                        } else {
                            None
                        },
                        forklaunch_validator: Some(VALIDATOR_VERSION.to_string()),
                        mikro_orm_core: Some(MIKRO_ORM_CORE_VERSION.to_string()),
                        mikro_orm_migrations: Some(MIKRO_ORM_MIGRATIONS_VERSION.to_string()),
                        mikro_orm_database: Some(MIKRO_ORM_DATABASE_VERSION.to_string()),
                        mikro_orm_reflection: Some(MIKRO_ORM_REFLECTION_VERSION.to_string()),
                        opentelemetry_api: None,
                        typebox: if service_data.is_typebox {
                            Some(TYPEBOX_VERSION.to_string())
                        } else {
                            None
                        },
                        ajv: Some(AJV_VERSION.to_string()),
                        dotenv: Some(DOTENV_VERSION.to_string()),
                        uuid: Some(UUID_VERSION.to_string()),
                        zod: if service_data.is_zod {
                            Some(ZOD_VERSION.to_string())
                        } else {
                            None
                        },
                        ..Default::default()
                    }),
                    "monitoring" => Some(ProjectDependencies {
                        forklaunch_core: Some(CORE_VERSION.to_string()),
                        ..Default::default()
                    }),
                    "universal-sdk" => Some(ProjectDependencies {
                        forklaunch_common: Some(COMMON_VERSION.to_string()),
                        forklaunch_universal_sdk: Some(UNIVERSAL_SDK_VERSION.to_string()),
                        better_auth: if global_module_config
                            .iam
                            .as_ref()
                            .is_some_and(|iam| iam == &IamConfig::BetterAuthIam)
                        {
                            Some(BETTER_AUTH_VERSION.to_string())
                        } else {
                            None
                        },
                        ..Default::default()
                    }),
                    _ => None,
                },
                match service_data.service_name.as_str() {
                    "core" => Some(ProjectDevDependencies {
                        types_uuid: Some(TYPES_UUID_VERSION.to_string()),
                        types_express: Some(TYPES_EXPRESS_VERSION.to_string()),
                        types_express_serve_static_core: Some(
                            TYPES_EXPRESS_SERVE_STATIC_CORE_VERSION.to_string(),
                        ),
                        types_qs: Some(TYPES_QS_VERSION.to_string()),
                        ..Default::default()
                    }),
                    "monitoring" => Some(ProjectDevDependencies {
                        ..Default::default()
                    }),
                    "universal-sdk" => Some(ProjectDevDependencies {
                        additional_deps: get_universal_sdk_additional_deps(
                            &service_data.app_name,
                            global_module_config.billing.is_some(),
                            global_module_config.iam.is_some(),
                        ),
                        ..Default::default()
                    }),
                    _ => None,
                },
                match service_data.service_name.as_str() {
                    "core" => Some(ProjectScripts {
                        build: Some(PROJECT_BUILD_SCRIPT.to_string()),
                        clean: Some(project_clean_script(&service_data.runtime.parse()?)),
                        docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
                        format: Some(project_format_script(&service_data.formatter.parse()?)),
                        lint: Some(project_lint_script(&service_data.linter.parse()?)),
                        lint_fix: Some(project_lint_fix_script(&service_data.linter.parse()?)),
                        test: project_test_script(&service_data.runtime.parse()?, &test_framework),
                        ..Default::default()
                    }),
                    "monitoring" => Some(ProjectScripts {
                        build: Some(PROJECT_BUILD_SCRIPT.to_string()),
                        clean: Some(project_clean_script(&service_data.runtime.parse()?)),
                        docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
                        format: Some(project_format_script(&service_data.formatter.parse()?)),
                        lint: Some(project_lint_script(&service_data.linter.parse()?)),
                        lint_fix: Some(project_lint_fix_script(&service_data.linter.parse()?)),
                        test: project_test_script(&service_data.runtime.parse()?, &test_framework),
                        ..Default::default()
                    }),
                    "universal-sdk" => Some(ProjectScripts {
                        build: Some(PROJECT_BUILD_SCRIPT.to_string()),
                        clean: Some(project_clean_script(&service_data.runtime.parse()?)),
                        docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
                        format: Some(project_format_script(&service_data.formatter.parse()?)),
                        lint: Some(project_lint_script(&service_data.linter.parse()?)),
                        lint_fix: Some(project_lint_fix_script(&service_data.linter.parse()?)),
                        test: project_test_script(&service_data.runtime.parse()?, &test_framework),
                        ..Default::default()
                    }),
                    _ => None,
                },
                match service_data.service_name.as_str() {
                    "core" => Some("lib/index.js".to_string()),
                    "monitoring" => None,
                    "universal-sdk" => None,
                    _ => None,
                },
            )?);
        }

        rendered_templates.push(RenderedTemplate {
            path: Path::new(&full_application_path).join("docker-compose.yaml"),
            content: docker_compose_string.unwrap(),
            context: None,
        });

        rendered_templates.push(generate_application_package_json(
            &data,
            bun_package_json_workspace_vec,
        )?);

        rendered_templates.push(
            generate_index_ts_database_export(
                &Path::new(&full_application_path),
                Some(vec![database.to_string()]),
                None,
            )
            .with_context(|| ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS)?,
        );

        rendered_templates.extend(
            generate_license(&Path::new(&full_application_path), &data)
                .with_context(|| ERROR_FAILED_TO_CREATE_LICENSE)?,
        );

        rendered_templates.extend(
            generate_gitignore(&Path::new(&full_application_path))
                .with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?,
        );

        if runtime == Runtime::Node {
            rendered_templates.extend(
                generate_pnpm_workspace(&full_application_path, &additional_projects)
                    .with_context(|| ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE)?,
            );
        }

        if additional_projects_names.contains(&"iam".to_string()) {
            rendered_templates.extend(
                generate_iam_keys(&Path::new(&full_application_path)).with_context(|| ERROR_FAILED_TO_SETUP_IAM)?,
            );
        }

        create_forklaunch_dir(&Path::new(&full_application_path).to_string_lossy().to_string(), dryrun)?;
        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)
            .with_context(|| "Failed to write application files")?;

        additional_projects_dirs
            .into_iter()
            .try_for_each(|template_dir| {
                generate_symlinks(
                    Some(&Path::new(&full_application_path)),
                    &Path::new(&full_application_path).join(&template_dir.output_path),
                    &mut data,
                    dryrun,
                )
            })?;

        if !dryrun {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "{} initialized successfully!", name)?;
            stdout.reset()?;
            format_code(&Path::new(&full_application_path), &data.runtime.parse()?);
        }

        Ok(())
    }
}
