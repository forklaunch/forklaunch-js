use std::{collections::HashMap, io::Write, path::Path};

use anyhow::{bail, Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use convert_case::{Case, Casing};
use ramhorns::Content;
use rustyline::{history::DefaultHistory, Editor};
use serde::{Deserialize, Serialize};
use serde_json::to_string_pretty;
use serde_yml::to_string;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use uuid::Uuid;

use crate::{
    config_struct,
    constants::{
        ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS, ERROR_FAILED_TO_CREATE_GITIGNORE,
        ERROR_FAILED_TO_CREATE_LICENSE, ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_SETUP_IAM, VALID_DATABASES, VALID_FRAMEWORKS, VALID_LICENSES,
        VALID_RUNTIMES, VALID_SERVICES, VALID_TEST_FRAMEWORKS, VALID_VALIDATORS,
    },
    core::{
        manifest::{ProjectEntry, ProjectType, ResourceInventory},
        token::get_token,
    },
    prompt::{
        prompt_comma_separated_list, prompt_with_validation, prompt_without_validation,
        ArrayCompleter,
    },
};

use super::{
    command,
    core::{
        database::{generate_database_export_index_ts, match_database},
        docker::{add_service_definition_to_docker_compose, DockerCompose},
        gitignore::generate_gitignore,
        iam::generate_iam_keys,
        license::{generate_license, match_license},
        manifest::generate_manifest,
        package_json::{
            application_package_json::{
                ApplicationDevDependencies, ApplicationPackageJson, ApplicationScripts,
            },
            package_json_constants::{
                application_build_script, application_clean_purge_script, application_clean_script,
                application_docs_script, application_migrate_script, application_test_script,
                application_up_packages_script, project_clean_script, project_test_script,
                AJV_VERSION, APP_DEV_BUILD_SCRIPT, APP_DEV_SCRIPT, APP_FORMAT_SCRIPT,
                APP_LINT_FIX_SCRIPT, APP_LINT_SCRIPT, APP_PREPARE_SCRIPT, COMMON_VERSION,
                CORE_VERSION, DOTENV_VERSION, ESLINT_VERSION, EXPRESS_VERSION, GLOBALS_VERSION,
                HUSKY_VERSION, HYPER_EXPRESS_VERSION, JEST_TYPES_VERSION, JEST_VERSION,
                LINT_STAGED_VERSION, MIKRO_ORM_CORE_VERSION, MIKRO_ORM_DATABASE_VERSION,
                MIKRO_ORM_MIGRATIONS_VERSION, MIKRO_ORM_REFLECTION_VERSION, PROJECT_BUILD_SCRIPT,
                PROJECT_DOCS_SCRIPT, PROJECT_FORMAT_SCRIPT, PROJECT_LINT_FIX_SCRIPT,
                PROJECT_LINT_SCRIPT, SORT_PACKAGE_JSON_VERSION, TSX_VERSION, TS_JEST_VERSION,
                TYPEBOX_VERSION, TYPESCRIPT_ESLINT_VERSION, TYPESCRIPT_VERSION, TYPES_UUID_VERSION,
                UUID_VERSION, VALIDATOR_VERSION, VITEST_VERSION, ZOD_VERSION,
            },
            project_package_json::{ProjectDependencies, ProjectDevDependencies, ProjectScripts},
        },
        pnpm_workspace::generate_pnpm_workspace,
        rendered_template::{create_forklaunch_dir, write_rendered_templates, RenderedTemplate},
        symlinks::generate_symlinks,
        template::{
            generate_with_template, get_routers_from_standard_package, PathIO, TemplateManifestData,
        },
    },
    service::{generate_service_package_json, ServiceManifestData},
    CliCommand,
};

config_struct!(
    #[derive(Debug, Serialize, Content, Clone)]
    pub(crate) struct ApplicationManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        database: String,
        #[serde(skip_serializing, skip_deserializing)]
        description: String,

        #[serde(skip_serializing, skip_deserializing)]
        is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        is_mongo: bool,
    }
);

#[derive(Debug)]
pub(super) struct ApplicationCommand;

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ApplicationCommand {
    fn command(&self) -> Command {
        // TODO: Add support for biome
        command("application", "Initialize a new full monorepo application")
            .alias("app")
            .arg(Arg::new("name").help("The name of the application"))
            .arg(
                Arg::new("database")
                    .short('d')
                    .long("database")
                    .help("The database to use")
                    .value_parser(VALID_DATABASES),
            )
            .arg(
                Arg::new("validator")
                    .short('v')
                    .long("validator")
                    .help("The validator to use")
                    .value_parser(VALID_VALIDATORS),
            )
            .arg(
                Arg::new("http-framework")
                    .short('f')
                    .long("http-framework")
                    .help("The framework to use")
                    .value_parser(VALID_FRAMEWORKS),
            )
            .arg(
                Arg::new("runtime")
                    .short('r')
                    .long("runtime")
                    .help("The runtime to use")
                    .value_parser(VALID_RUNTIMES),
            )
            .arg(
                Arg::new("test-framework")
                    .short('t')
                    .long("test-framework")
                    .help("The test framework to use")
                    .value_parser(VALID_TEST_FRAMEWORKS),
            )
            .arg(
                Arg::new("services")
                    .short('s')
                    .long("services")
                    .help("Additional services to include")
                    .value_parser(VALID_SERVICES)
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
                    .value_parser(VALID_LICENSES),
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

        let database = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "database",
            matches,
            "Enter database type",
            Some(&VALID_DATABASES),
            |input| VALID_DATABASES.contains(&input),
            |_| "Invalid database type. Please try again".to_string(),
        )?;

        let validator = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "validator",
            matches,
            "Enter validator type",
            Some(&VALID_VALIDATORS),
            |input| VALID_VALIDATORS.contains(&input),
            |_| "Invalid validator type. Please try again".to_string(),
        )?;

        let runtime = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "runtime",
            matches,
            "Enter runtime",
            Some(&VALID_RUNTIMES),
            |input| VALID_RUNTIMES.contains(&input),
            |_| "Invalid runtime. Please try again".to_string(),
        )?;

        let http_framework = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "http-framework",
            matches,
            "Enter HTTP framework",
            Some(&VALID_FRAMEWORKS),
            |input| {
                VALID_FRAMEWORKS.contains(&input) && !(runtime == "bun" && input == "hyper-express")
            },
            |input| {
                if runtime == "bun" && input == "hyper-express" {
                    "Hyper Express is not supported for bun".to_string()
                } else {
                    "Invalid HTTP framework. Please try again".to_string()
                }
            },
        )?;

        let test_framework = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "test-framework",
            matches,
            "Enter test framework",
            Some(&VALID_TEST_FRAMEWORKS),
            |input| VALID_TEST_FRAMEWORKS.contains(&input),
            |_| "Invalid test framework. Please try again".to_string(),
        )?;

        let services = prompt_comma_separated_list(
            &mut line_editor,
            "services",
            matches,
            &VALID_SERVICES,
            "services",
            false,
        )?;

        // let _libraries = prompt_comma_separated_list(
        //     &mut line_editor,
        //     "libraries",
        //     matches,
        //     &VALID_LIBRARIES,
        //     "libraries",
        //     true,
        // )?;

        let description = prompt_without_validation(
            &mut line_editor,
            &mut stdout,
            "description",
            matches,
            "Enter project description (optional): ",
        )?;

        let author = prompt_with_validation(
            &mut line_editor,
            &mut stdout,
            "author",
            matches,
            "Enter author name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Author name cannot be empty. Please try again".to_string(),
        )?;

        let license = match_license(
            prompt_with_validation(
                &mut line_editor,
                &mut stdout,
                "license",
                matches,
                "Enter license",
                Some(&VALID_LICENSES),
                |input: &str| match_license(&input.to_lowercase()).is_ok(),
                |_| "Invalid license. Please try again".to_string(),
            )?
            .as_str(),
        )?;
        // TODO: Add support for libraries
        // let libraries = matches.get_many::<String>("libraries").unwrap_or_default();

        let mut ignore_files = vec!["pnpm-workspace.yaml", "pnpm-lock.yml"];

        // TODO: maybe abstract this into a function
        let all_test_framework_config_files = vec!["vitest.config.ts", "jest.config.ts"];
        let test_framework_config_file = match test_framework.as_str() {
            "vitest" => "vitest.config.ts",
            "jest" => "jest.config.ts",
            _ => bail!("Invalid test framework: {}", test_framework),
        };
        ignore_files.extend(
            all_test_framework_config_files
                .into_iter()
                .filter(|config| config != &test_framework_config_file),
        );

        // filter out database base entities if not used
        let all_database_base_entities = vec!["base.entity.ts", "mongo.base.entity.ts"];
        let database_base_entity = match database.as_str() {
            "mongodb" => "mongo.base.entity.ts",
            "postgresql" => "base.entity.ts",
            _ => bail!("Invalid database: {}", database),
        };
        ignore_files.extend(
            all_database_base_entities
                .into_iter()
                .filter(|entity| entity != &database_base_entity),
        );

        // Inline specific perms checks here. Make remote calls to receive templates for specific services if needed here (premium only).

        let mut additional_projects = vec![ProjectEntry {
            r#type: ProjectType::Library,
            name: "core".to_string(),
            resources: None,
            routers: None,
        }];
        additional_projects.extend(services.into_iter().map(|package| ProjectEntry {
            r#type: ProjectType::Service,
            name: package.to_string(),
            resources: Some(ResourceInventory {
                database: Some(database.to_string()),
                cache: None,
            }),
            routers: get_routers_from_standard_package(package),
        }));

        let additional_projects_names = additional_projects
            .clone()
            .into_iter()
            .map(|p| p.name.clone())
            .collect::<Vec<String>>();

        let mut project_peer_topology = HashMap::new();
        project_peer_topology.insert(name.to_string(), additional_projects_names.clone());

        let bun_package_json_workspace_vec = match runtime.as_str() {
            "bun" => Some(additional_projects_names.clone()),
            _ => None,
        };

        let mut data = ApplicationManifestData {
            id: Uuid::new_v4().to_string(),
            cli_version: env!("CARGO_PKG_VERSION").to_string(),
            database: database.to_string(),
            app_name: name.to_string(),
            validator: validator.to_string(),
            http_framework: match http_framework.as_str() {
                "express" => "express".to_string(),
                "hyper-express" => "hyper-express".to_string(),
                _ => bail!("Invalid HTTP framework: {}", http_framework),
            },
            runtime: runtime.to_string(),
            test_framework: test_framework.to_string(),
            projects: additional_projects.clone(),
            project_peer_topology,
            description: description.to_string(),
            author: author.to_string(),
            license: license.to_string(),

            is_express: http_framework == "express",
            is_hyper_express: http_framework == "hyper-express",
            is_zod: validator == "zod",
            is_typebox: validator == "typebox",
            is_bun: runtime == "bun",
            is_node: runtime == "node",
            is_vitest: test_framework == "vitest",
            is_jest: test_framework == "jest",

            is_postgres: database == "postgresql",
            is_mongo: database == "mongodb",
        };

        let mut rendered_templates = Vec::new();

        rendered_templates.extend(
            generate_manifest(&Path::new(&name).to_string_lossy().to_string(), &data)
                .with_context(|| "Failed to setup manifest file for application")?,
        );

        // TODO: support different path delimiters
        let mut template_dirs = vec![];

        let additional_projects_dirs = additional_projects.clone().into_iter().map(|path| PathIO {
            input_path: Path::new("project")
                .join(&path.name)
                .to_string_lossy()
                .to_string(),
            output_path: path.name,
        });
        template_dirs.extend(additional_projects_dirs.clone());

        rendered_templates.extend(generate_with_template(
            Some(&name),
            &PathIO {
                input_path: Path::new("application").to_string_lossy().to_string(),
                output_path: "".to_string(),
            },
            &TemplateManifestData::Application(&data),
            &ignore_files
                .iter()
                .map(|ignore_file| ignore_file.to_string())
                .collect::<Vec<String>>(),
        )?);

        let mut docker_compose_string = Some(to_string(&DockerCompose::default()).unwrap());
        for template_dir in template_dirs {
            let service_data = ServiceManifestData {
                id: data.id.clone(),
                cli_version: data.cli_version.clone(),
                app_name: data.app_name.clone(),
                service_name: template_dir.output_path.to_string(),
                camel_case_name: template_dir.output_path.to_case(Case::Camel),
                pascal_case_name: template_dir.output_path.to_case(Case::Pascal),
                kebab_case_name: template_dir.output_path.to_case(Case::Kebab),
                validator: data.validator.clone(),
                http_framework: data.http_framework.clone(),
                runtime: data.runtime.clone(),
                test_framework: data.test_framework.clone(),
                projects: data.projects.clone(),
                project_peer_topology: data.project_peer_topology.clone(),
                author: data.author.clone(),
                description: data.description.clone(),
                license: data.license.clone(),

                is_express: data.is_express,
                is_hyper_express: data.is_hyper_express,
                is_zod: data.is_zod,
                is_typebox: data.is_typebox,
                is_bun: data.is_bun,
                is_node: data.is_node,
                is_vitest: data.is_vitest,
                is_jest: data.is_jest,
                is_postgres: database == "postgresql",
                is_mongo: database == "mongodb",

                database: database.to_string(),
                db_driver: match_database(&database),
            };

            if service_data.service_name != "core" {
                docker_compose_string = Some(add_service_definition_to_docker_compose(
                    &service_data,
                    &Path::new(&name).to_string_lossy().to_string(),
                    docker_compose_string,
                )?);
            }

            rendered_templates.extend(generate_with_template(
                Some(&name),
                &template_dir,
                &TemplateManifestData::Service(&service_data),
                &ignore_files
                    .iter()
                    .map(|ignore_file| ignore_file.to_string())
                    .collect::<Vec<String>>(),
            )?);
            rendered_templates.push(generate_service_package_json(
                &service_data,
                &Path::new(&name)
                    .join(&template_dir.output_path)
                    .to_string_lossy()
                    .to_string(),
                if service_data.service_name == "core" {
                    Some(ProjectDependencies {
                        app_name: service_data.app_name.clone(),
                        database: Some(service_data.database.clone()),
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
                    })
                } else {
                    None
                },
                if service_data.service_name == "core" {
                    Some(ProjectDevDependencies {
                        eslint: Some(ESLINT_VERSION.to_string()),
                        typescript_eslint: Some(TYPESCRIPT_ESLINT_VERSION.to_string()),
                        types_uuid: Some(TYPES_UUID_VERSION.to_string()),
                        ..Default::default()
                    })
                } else {
                    None
                },
                if service_data.service_name == "core" {
                    Some(ProjectScripts {
                        build: Some(PROJECT_BUILD_SCRIPT.to_string()),
                        clean: Some(
                            project_clean_script(service_data.runtime.as_str()).to_string(),
                        ),
                        docs: Some(PROJECT_DOCS_SCRIPT.to_string()),
                        format: Some(PROJECT_FORMAT_SCRIPT.to_string()),
                        lint: Some(PROJECT_LINT_SCRIPT.to_string()),
                        lint_fix: Some(PROJECT_LINT_FIX_SCRIPT.to_string()),
                        test: Some(
                            project_test_script(service_data.test_framework.as_str()).to_string(),
                        ),
                        ..Default::default()
                    })
                } else {
                    None
                },
                if service_data.service_name == "core" && service_data.is_node {
                    Some("lib/index.js".to_string())
                } else {
                    None
                },
            )?);
        }

        rendered_templates.push(RenderedTemplate {
            path: Path::new(&name).join("docker-compose.yaml"),
            content: docker_compose_string.unwrap(),
            context: None,
        });

        rendered_templates.push(generate_application_package_json(
            &data,
            bun_package_json_workspace_vec,
        )?);

        rendered_templates.push(
            generate_database_export_index_ts(
                &Path::new(&name).to_string_lossy().to_string(),
                Some(vec![database.to_string()]),
                None,
            )
            .with_context(|| ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS)?,
        );

        rendered_templates.extend(
            generate_license(&Path::new(&name).to_string_lossy().to_string(), &data)
                .with_context(|| ERROR_FAILED_TO_CREATE_LICENSE)?,
        );

        rendered_templates.extend(
            generate_gitignore(&Path::new(&name).to_string_lossy().to_string())
                .with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?,
        );

        if runtime == "node" {
            rendered_templates.extend(
                generate_pnpm_workspace(&name, &additional_projects)
                    .with_context(|| ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE)?,
            );
        }

        if additional_projects_names.contains(&"iam".to_string()) {
            rendered_templates.extend(
                generate_iam_keys(&Path::new(&name)).with_context(|| ERROR_FAILED_TO_SETUP_IAM)?,
            );
        }

        create_forklaunch_dir(&Path::new(&name).to_string_lossy().to_string())?;
        write_rendered_templates(&rendered_templates)
            .with_context(|| "Failed to write application files")?;

        additional_projects_dirs
            .into_iter()
            .try_for_each(|template_dir| {
                generate_symlinks(
                    Some(&name),
                    &Path::new(&name)
                        .join(&template_dir.output_path)
                        .to_string_lossy()
                        .to_string(),
                    &mut data,
                )
            })?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "{} initialized successfully!", name)?;
        stdout.reset()?;

        Ok(())
    }
}

fn generate_application_package_json(
    data: &ApplicationManifestData,
    bun_workspace_projects: Option<Vec<String>>,
) -> Result<RenderedTemplate> {
    let package_json_contents = ApplicationPackageJson {
        name: Some(data.app_name.clone()),
        version: Some("0.0.1".to_string()),
        description: Some(data.description.clone()),
        keywords: Some(vec![]),
        license: Some(data.license.clone()),
        author: Some(data.author.clone()),
        workspaces: bun_workspace_projects,
        scripts: Some(ApplicationScripts {
            build: Some(application_build_script(data.runtime.as_str()).to_string()),
            clean: Some(application_clean_script(data.runtime.as_str()).to_string()),
            clean_purge: Some(application_clean_purge_script(data.runtime.as_str()).to_string()),
            dev: Some(APP_DEV_SCRIPT.to_string()),
            dev_build: Some(APP_DEV_BUILD_SCRIPT.to_string()),
            docs: Some(application_docs_script(data.runtime.as_str()).to_string()),
            format: Some(APP_FORMAT_SCRIPT.to_string()),
            lint: Some(APP_LINT_SCRIPT.to_string()),
            lint_fix: Some(APP_LINT_FIX_SCRIPT.to_string()),
            prepare: Some(APP_PREPARE_SCRIPT.to_string()),
            migrate_create: Some(application_migrate_script(
                data.runtime.as_str(),
                data.database.as_str(),
                "create",
            )),
            migrate_down: Some(application_migrate_script(
                data.runtime.as_str(),
                data.database.as_str(),
                "down",
            )),
            migrate_init: Some(application_migrate_script(
                data.runtime.as_str(),
                data.database.as_str(),
                "init",
            )),
            migrate_up: Some(application_migrate_script(
                data.runtime.as_str(),
                data.database.as_str(),
                "up",
            )),
            test: Some(
                application_test_script(data.runtime.as_str(), data.test_framework.as_str())
                    .to_string(),
            ),
            up_packages: Some(application_up_packages_script(data.runtime.as_str()).to_string()),
        }),
        dev_dependencies: Some(ApplicationDevDependencies {
            types_jest: if data.is_jest {
                Some(JEST_TYPES_VERSION.to_string())
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
            sort_package_json: Some(SORT_PACKAGE_JSON_VERSION.to_string()),
            ts_jest: if data.is_jest {
                Some(TS_JEST_VERSION.to_string())
            } else {
                None
            },
            tsx: Some(TSX_VERSION.to_string()),
            typescript: Some(TYPESCRIPT_VERSION.to_string()),
            vitest: if data.is_vitest {
                Some(VITEST_VERSION.to_string())
            } else {
                None
            },
        }),
    };

    Ok(RenderedTemplate {
        path: Path::new(&data.app_name).join("package.json"),
        content: to_string_pretty(&package_json_contents).unwrap(),
        context: None,
    })
}
