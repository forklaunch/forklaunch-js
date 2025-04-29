use std::{
    collections::HashMap,
    fs::{exists, read_to_string},
    io::Write,
    path::Path,
};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use dialoguer::{theme::ColorfulTheme, Confirm, MultiSelect};
use glob::Pattern;
use ramhorns::Template;
use rustyline::{history::DefaultHistory, Editor};
use termcolor::{ColorChoice, StandardStream};
use walkdir::WalkDir;

use crate::{
    constants::{
        Database, Formatter, HttpFramework, License, Linter, Runtime, TestFramework, Validator,
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        ast::transformations::{
            transform_core_registration_http_framework_ts::transform_core_registration_http_framework_ts,
            transform_core_registration_validator_ts::transform_core_registration_validator_ts,
        },
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        docker::update_dockerfile_contents,
        license::{generate_license, match_license},
        manifest::{
            application::ApplicationManifestData, service::ServiceManifestData, ProjectType,
        },
        package_json::{
            application_package_json::{
                ApplicationDevDependencies, ApplicationPackageJson, ApplicationScripts,
            },
            package_json_constants::{
                application_build_script, application_clean_purge_script, application_clean_script,
                application_docs_script, application_format_script, application_lint_fix_script,
                application_lint_script, application_migrate_script, application_seed_script,
                application_setup_script, application_test_script, application_up_packages_script,
                project_clean_script, project_dev_local_script, project_dev_server_script,
                project_dev_worker_client_script, project_format_script, project_lint_fix_script,
                project_lint_script, project_start_server_script, project_start_worker_script,
                project_test_script, BIOME_VERSION, ESLINT_VERSION, EXPRESS_VERSION,
                HYPER_EXPRESS_VERSION, JEST_VERSION, OXLINT_VERSION, PRETTIER_VERSION,
                TS_JEST_VERSION, TYPEBOX_VERSION, TYPESCRIPT_ESLINT_VERSION, VITEST_VERSION,
                ZOD_VERSION,
            },
            project_package_json::{
                ProjectDependencies, ProjectDevDependencies, ProjectPackageJson, ProjectScripts,
            },
        },
        removal_template::{remove_template_files, RemovalTemplate},
        rendered_template::{
            write_rendered_templates, RenderedTemplate, RenderedTemplatesCache, TEMPLATES_DIR,
        },
        symlink_template::{create_symlinks, SymlinkTemplate},
        watermark::apply_watermark,
    },
    prompt::{prompt_field_from_selections_with_validation, ArrayCompleter},
    CliCommand,
};

#[derive(Debug)]
pub(super) struct ApplicationCommand;

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

fn should_ignore(path: &Path, patterns: &[Vec<String>]) -> bool {
    patterns.iter().any(|pattern_set| {
        pattern_set.iter().any(|pattern| {
            Pattern::new(pattern)
                .unwrap()
                .matches(&path.to_string_lossy())
        })
    })
}

fn change_name(
    manifest_data: &mut ApplicationManifestData,
    base_path: &Path,
    name: &str,
    application_json_to_write: &mut ApplicationPackageJson,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<()> {
    let existing_name = manifest_data.app_name.clone();

    manifest_data.app_name = name.to_string();

    application_json_to_write.name = Some(name.to_string());
    for project in project_jsons_to_write.values_mut() {
        project.name = Some(
            project
                .name
                .as_ref()
                .unwrap()
                .replace(&manifest_data.app_name, name),
        );
    }

    let mut ignore_pattern_stack: Vec<Vec<String>> = Vec::new();
    for entry in WalkDir::new(base_path).contents_first(false) {
        let entry = entry?;
        let path = entry.path();
        let relative_path = path.strip_prefix(base_path)?;

        if entry.file_type().is_dir() {
            // Check for .flignore in this directory
            let flignore_path = path.join(".flignore");
            if flignore_path.exists() {
                let new_patterns = read_to_string(flignore_path)?
                    .lines()
                    .filter(|line| !line.starts_with('#') && !line.is_empty())
                    .map(|line| line.to_string())
                    .collect::<Vec<String>>();
                ignore_pattern_stack.push(new_patterns);
            }

            // If we're exiting a directory (post-order traversal)
            if path != base_path && entry.depth() < ignore_pattern_stack.len() {
                // Pop patterns for directories we're leaving
                let levels_to_pop = ignore_pattern_stack.len() - entry.depth();
                for _ in 0..levels_to_pop {
                    ignore_pattern_stack.pop();
                }
            }
        } else if entry.file_type().is_file() {
            // Skip if the file matches any ignore pattern from any level
            if should_ignore(relative_path, &ignore_pattern_stack) {
                continue;
            }

            let contents = rendered_templates_cache.get(path)?.unwrap().content.clone();

            let new_contents = contents
                .replace(
                    format!("@{}", &existing_name).as_str(),
                    format!("@{}", name).as_str(),
                )
                .replace(
                    format!("{}-", &existing_name).as_str(),
                    format!("{}-", name).as_str(),
                )
                .replace(
                    format!("/{}", &existing_name).as_str(),
                    format!("/{}", name).as_str(),
                );
            if contents != new_contents {
                rendered_templates_cache.insert(
                    path.to_string_lossy(),
                    RenderedTemplate {
                        path: path.to_path_buf(),
                        content: new_contents,
                        context: None,
                    },
                );
            }
        }
    }

    Ok(())
}

fn change_description(description: &str, application_json_to_write: &mut ApplicationPackageJson) {
    application_json_to_write.description = Some(description.to_string());
}

fn attempt_replacement(
    additional_scripts: &mut HashMap<String, String>,
    existing_script: Option<&String>,
    existing_script_choice: &str,
    existing_script_generation: &str,
    script_key: &str,
    script_choice: &str,
    script_replacement: &str,
) -> String {
    if let Some(existing_script) = existing_script {
        if existing_script != existing_script_generation {
            additional_scripts.insert(
                format!("{}:{}", script_key, existing_script_choice),
                existing_script.to_owned(),
            );
        }
    }

    let modified_format_script_key = format!("{}:{}", script_key, script_choice);
    if additional_scripts.contains_key(&modified_format_script_key) {
        let stashed_script = additional_scripts
            .get(&modified_format_script_key)
            .unwrap()
            .to_owned();
        additional_scripts.remove(&modified_format_script_key);
        stashed_script
    } else {
        script_replacement.to_owned()
    }
}

fn update_config_files(
    base_path: &Path,
    exclusive_files: &[&str],
    existing_files: Vec<&str>,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<(Vec<RemovalTemplate>, Vec<SymlinkTemplate>)> {
    let mut removal_templates = vec![];
    let mut symlink_templates = vec![];

    for file in exclusive_files {
        // add config files,
        let linter_config_file_contents = TEMPLATES_DIR
            .get_file(Path::new("application").join(file.to_string()))
            .unwrap()
            .contents_utf8()
            .unwrap();

        rendered_templates_cache.insert(
            base_path.join(file).to_string_lossy(),
            RenderedTemplate {
                path: base_path.join(file),
                content: linter_config_file_contents.to_string(),
                context: None,
            },
        );

        for project in project_jsons_to_write.keys() {
            symlink_templates.push(SymlinkTemplate {
                path: base_path.join(file),
                target: base_path.join(project).join(file),
            });
        }
    }

    for file in existing_files {
        let file_path = base_path.join(file);
        if exists(&file_path)? {
            let file_content = read_to_string(&file_path)?;
            let watermarked_file_content = apply_watermark(&RenderedTemplate {
                path: file_path.clone(),
                content: TEMPLATES_DIR
                    .get_file(Path::new("application").join(file.to_string()))
                    .unwrap()
                    .contents_utf8()
                    .unwrap()
                    .to_string(),
                context: None,
            })?;

            if file_content == watermarked_file_content {
                for project in project_jsons_to_write.keys() {
                    removal_templates.push(RemovalTemplate {
                        path: base_path.join(project).join(file),
                    });
                }
                removal_templates.push(RemovalTemplate { path: file_path });
            }
        }
    }

    Ok((removal_templates, symlink_templates))
}

fn update_project_package_json<
    ProjectScriptsUpdateFunction,
    ProjectDependenciesUpdateFunction,
    ProjectDevDependenciesUpdateFunction,
>(
    project_json_to_write: &mut ProjectPackageJson,
    project_package_json_script_setters: &ProjectScriptsUpdateFunction,
    project_package_json_dependencies_setters: &ProjectDependenciesUpdateFunction,
    project_package_json_dev_dependencies_setters: &ProjectDevDependenciesUpdateFunction,
) -> Result<()>
where
    ProjectScriptsUpdateFunction: Fn(&mut ProjectScripts),
    ProjectDependenciesUpdateFunction: Fn(&mut ProjectDependencies),
    ProjectDevDependenciesUpdateFunction: Fn(&mut ProjectDevDependencies),
{
    if let Some(scripts) = project_json_to_write.scripts.as_mut() {
        project_package_json_script_setters(scripts);
    }

    if let Some(dependencies) = project_json_to_write.dependencies.as_mut() {
        project_package_json_dependencies_setters(dependencies);
    }

    if let Some(dev_dependencies) = project_json_to_write.dev_dependencies.as_mut() {
        project_package_json_dev_dependencies_setters(dev_dependencies);
    }

    Ok(())
}

fn update_application_and_project_package_jsons<
    ApplicationScriptsUpdateFunction,
    ProjectScriptsUpdateFunction,
    ProjectDependenciesUpdateFunction,
    ApplicationDevDependenciesUpdateFunction,
    ProjectDevDependenciesUpdateFunction,
>(
    application_json_to_write: &mut ApplicationPackageJson,
    project_jsons_to_write: Vec<&mut ProjectPackageJson>,
    application_package_json_script_setters: &ApplicationScriptsUpdateFunction,
    project_package_json_script_setters: &ProjectScriptsUpdateFunction,
    project_package_json_dependencies_setters: &ProjectDependenciesUpdateFunction,
    application_package_json_dev_dependencies_setters: &ApplicationDevDependenciesUpdateFunction,
    project_package_json_dev_dependencies_setters: &ProjectDevDependenciesUpdateFunction,
) -> Result<()>
where
    ApplicationScriptsUpdateFunction: Fn(&mut ApplicationScripts),
    ProjectScriptsUpdateFunction: Fn(&mut ProjectScripts),
    ProjectDependenciesUpdateFunction: Fn(&mut ProjectDependencies),
    ApplicationDevDependenciesUpdateFunction: Fn(&mut ApplicationDevDependencies),
    ProjectDevDependenciesUpdateFunction: Fn(&mut ProjectDevDependencies),
{
    if let Some(scripts) = application_json_to_write.scripts.as_mut() {
        application_package_json_script_setters(scripts);
    }

    if let Some(dev_dependencies) = application_json_to_write.dev_dependencies.as_mut() {
        application_package_json_dev_dependencies_setters(dev_dependencies);
    }

    for project_json in project_jsons_to_write {
        update_project_package_json(
            project_json,
            project_package_json_script_setters,
            project_package_json_dependencies_setters,
            project_package_json_dev_dependencies_setters,
        )?;
    }

    Ok(())
}

fn change_formatter(
    base_path: &Path,
    formatter: &Formatter,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut ApplicationPackageJson,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<(Vec<RemovalTemplate>, Vec<SymlinkTemplate>)> {
    let existing_formatter = manifest_data.formatter.parse::<Formatter>()?;

    manifest_data.formatter = formatter.to_string();

    let exclusive_files = formatter.metadata().exclusive_files.unwrap();
    let existing_files = formatter.all_other_files();

    let (removal_templates, symlink_templates) = update_config_files(
        base_path,
        exclusive_files,
        existing_files,
        project_jsons_to_write,
        rendered_templates_cache,
    )?;

    update_application_and_project_package_jsons(
        application_json_to_write,
        project_jsons_to_write.values_mut().collect(),
        &|scripts| {
            scripts.format = Some(attempt_replacement(
                &mut scripts.additional_scripts,
                scripts.format.as_ref(),
                &existing_formatter.to_string(),
                &application_format_script(&existing_formatter),
                "format",
                &formatter.to_string(),
                &application_format_script(formatter),
            ));
        },
        &|scripts| {
            scripts.format = Some(attempt_replacement(
                &mut scripts.additional_scripts,
                scripts.format.as_ref(),
                &existing_formatter.to_string(),
                &project_format_script(&existing_formatter),
                "format",
                &formatter.to_string(),
                &project_format_script(formatter),
            ));
        },
        &|_| {},
        &|dev_dependencies| {
            dev_dependencies.prettier = None;
            dev_dependencies.biome = None;

            match formatter {
                Formatter::Prettier => {
                    dev_dependencies.prettier = Some(PRETTIER_VERSION.to_string());
                }
                Formatter::Biome => {
                    dev_dependencies.biome = Some(BIOME_VERSION.to_string());
                }
            }
        },
        &|dev_dependencies| {
            dev_dependencies.prettier = None;
            dev_dependencies.biome = None;

            match formatter {
                Formatter::Prettier => {
                    dev_dependencies.prettier = Some(PRETTIER_VERSION.to_string());
                }
                Formatter::Biome => {
                    dev_dependencies.biome = Some(BIOME_VERSION.to_string());
                }
            }
        },
    )?;

    Ok((removal_templates, symlink_templates))
}

fn change_linter(
    base_path: &Path,
    linter: &Linter,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut ApplicationPackageJson,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<(Vec<RemovalTemplate>, Vec<SymlinkTemplate>)> {
    let existing_linter = manifest_data.linter.parse::<Linter>()?;

    manifest_data.linter = linter.to_string();

    let exclusive_files = linter.metadata().exclusive_files.unwrap();
    let existing_files = linter.all_other_files();

    let (removal_templates, symlink_templates) = update_config_files(
        base_path,
        exclusive_files,
        existing_files,
        project_jsons_to_write,
        rendered_templates_cache,
    )?;

    update_application_and_project_package_jsons(
        application_json_to_write,
        project_jsons_to_write.values_mut().collect(),
        &|scripts| {
            scripts.lint = Some(attempt_replacement(
                &mut scripts.additional_scripts,
                scripts.lint.as_ref(),
                &existing_linter.to_string(),
                &application_lint_script(&existing_linter),
                "lint",
                &linter.to_string(),
                &application_lint_script(linter),
            ));

            scripts.lint_fix = Some(attempt_replacement(
                &mut scripts.additional_scripts,
                scripts.lint_fix.as_ref(),
                &existing_linter.to_string(),
                &application_lint_fix_script(&existing_linter),
                "lint-fix",
                &linter.to_string(),
                &application_lint_fix_script(linter),
            ));
        },
        &|scripts| {
            scripts.lint = Some(attempt_replacement(
                &mut scripts.additional_scripts,
                scripts.lint.as_ref(),
                &existing_linter.to_string(),
                &project_lint_script(&existing_linter),
                "lint",
                &linter.to_string(),
                &project_lint_script(linter),
            ));

            scripts.lint_fix = Some(attempt_replacement(
                &mut scripts.additional_scripts,
                scripts.lint_fix.as_ref(),
                &existing_linter.to_string(),
                &project_lint_fix_script(&existing_linter),
                "lint-fix",
                &linter.to_string(),
                &project_lint_fix_script(linter),
            ));
        },
        &|_| {},
        &|dev_dependencies| {
            dev_dependencies.eslint = None;
            dev_dependencies.eslint_js = None;
            dev_dependencies.typescript_eslint = None;
            dev_dependencies.oxlint = None;

            match linter {
                Linter::Eslint => {
                    dev_dependencies.eslint = Some(ESLINT_VERSION.to_string());
                    dev_dependencies.eslint_js = Some(ESLINT_VERSION.to_string());
                    dev_dependencies.typescript_eslint =
                        Some(TYPESCRIPT_ESLINT_VERSION.to_string());
                }
                Linter::Oxlint => {
                    dev_dependencies.oxlint = Some(OXLINT_VERSION.to_string());
                }
            }
        },
        &|dev_dependencies| {
            dev_dependencies.eslint = None;
            dev_dependencies.eslint_js = None;
            dev_dependencies.typescript_eslint = None;
            dev_dependencies.oxlint = None;

            match linter {
                Linter::Eslint => {
                    dev_dependencies.eslint = Some(ESLINT_VERSION.to_string());
                    dev_dependencies.eslint_js = Some(ESLINT_VERSION.to_string());
                    dev_dependencies.typescript_eslint =
                        Some(TYPESCRIPT_ESLINT_VERSION.to_string());
                }
                Linter::Oxlint => {
                    dev_dependencies.oxlint = Some(OXLINT_VERSION.to_string());
                }
            }
        },
    )?;

    Ok((removal_templates, symlink_templates))
}

fn change_validator(
    base_path: &Path,
    validator: &Validator,
    manifest_data: &mut ApplicationManifestData,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<()> {
    manifest_data.validator = validator.to_string();

    let validator_file_key = base_path.join("core").join("registration.ts");

    for project in project_jsons_to_write.values_mut() {
        let dependencies = project.dependencies.as_mut().unwrap();
        dependencies.zod = None;
        dependencies.typebox = None;

        match validator {
            Validator::Zod => {
                dependencies.zod = Some(ZOD_VERSION.to_string());
            }
            Validator::Typebox => {
                dependencies.typebox = Some(TYPEBOX_VERSION.to_string());
            }
        }
    }

    rendered_templates_cache.insert(
        validator_file_key.to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("core").join("registration.ts"),
            content: transform_core_registration_validator_ts(
                &validator.to_string(),
                base_path,
                rendered_templates_cache
                    .get(&validator_file_key)?
                    .and_then(|v| Some(v.content.clone())),
            )?,
            context: None,
        },
    );

    Ok(())
}

fn change_http_framework(
    base_path: &Path,
    http_framework: &HttpFramework,
    manifest_data: &mut ApplicationManifestData,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<()> {
    manifest_data.http_framework = http_framework.to_string();

    let http_framework_file_key = base_path.join("core").join("registration.ts");

    for project in project_jsons_to_write.values_mut() {
        let dependencies = project.dependencies.as_mut().unwrap();
        dependencies.forklaunch_express = None;
        dependencies.forklaunch_hyper_express = None;

        match http_framework {
            HttpFramework::Express => {
                dependencies.forklaunch_express = Some(EXPRESS_VERSION.to_string());
            }
            HttpFramework::HyperExpress => {
                dependencies.forklaunch_hyper_express = Some(HYPER_EXPRESS_VERSION.to_string());
            }
        }
    }

    rendered_templates_cache.insert(
        http_framework_file_key.to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("core").join("registration.ts"),
            content: transform_core_registration_http_framework_ts(
                &http_framework.to_string(),
                base_path,
                rendered_templates_cache
                    .get(&http_framework_file_key)?
                    .and_then(|v| Some(v.content.clone())),
            )?,
            context: None,
        },
    );

    Ok(())
}

fn change_runtime(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &clap::ArgMatches,
    base_path: &Path,
    runtime: &Runtime,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut ApplicationPackageJson,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Vec<RemovalTemplate>> {
    let existing_runtime = manifest_data.runtime.parse::<Runtime>()?;
    let existing_database = manifest_data.database.parse::<Database>()?;

    let mut removal_templates = vec![];

    let existing_workspaces: Vec<String> = match manifest_data.runtime.parse()? {
        Runtime::Bun => application_json_to_write
            .workspaces
            .as_ref()
            .unwrap()
            .clone(),
        Runtime::Node => serde_yml::from_str::<Vec<String>>(&read_to_string(
            &base_path.join("pnpm-workspace.yaml"),
        )?)?,
    };

    manifest_data.runtime = runtime.to_string();

    let test_framework = match runtime {
        Runtime::Bun => {
            manifest_data.test_framework = None;
            None
        }
        Runtime::Node => {
            if manifest_data.test_framework.is_none() {
                let test_framework = prompt_field_from_selections_with_validation(
                    "test-framework",
                    None,
                    &["vitest", "jest"],
                    line_editor,
                    stdout,
                    matches,
                    "Enter test framework: ",
                    None,
                    |input: &str| TestFramework::VARIANTS.contains(&input),
                    |_| "Invalid test framework. Please try again".to_string(),
                )?
                .unwrap()
                .parse::<TestFramework>()?;

                Some(test_framework)
            } else {
                Some(
                    manifest_data
                        .test_framework
                        .as_ref()
                        .unwrap()
                        .parse::<TestFramework>()?,
                )
            }
        }
    };

    removal_templates.extend(change_test_framework(
        base_path,
        &test_framework,
        manifest_data,
        application_json_to_write,
        project_jsons_to_write,
        rendered_templates_cache,
    )?);

    let application_package_json_scripts = application_json_to_write.scripts.as_mut().unwrap();

    application_package_json_scripts.build = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.build.as_ref(),
        &existing_runtime.to_string(),
        &application_build_script(&existing_runtime),
        "build",
        &runtime.to_string(),
        &application_build_script(runtime),
    ));
    application_package_json_scripts.clean = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.clean.as_ref(),
        &existing_runtime.to_string(),
        &application_clean_script(&existing_runtime),
        "clean",
        &runtime.to_string(),
        &application_clean_script(runtime),
    ));
    application_package_json_scripts.clean_purge = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.clean_purge.as_ref(),
        &existing_runtime.to_string(),
        &application_clean_purge_script(&existing_runtime),
        "clean-purge",
        &runtime.to_string(),
        &application_clean_purge_script(runtime),
    ));
    application_package_json_scripts.database_setup = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.database_setup.as_ref(),
        &existing_runtime.to_string(),
        &application_setup_script(&existing_runtime),
        "database-setup",
        &runtime.to_string(),
        &application_setup_script(runtime),
    ));
    application_package_json_scripts.docs = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.docs.as_ref(),
        &existing_runtime.to_string(),
        &application_docs_script(&existing_runtime),
        "docs",
        &runtime.to_string(),
        &application_docs_script(runtime),
    ));
    application_package_json_scripts.migrate_create = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.migrate_create.as_ref(),
        &existing_runtime.to_string(),
        &application_migrate_script(&existing_runtime, &existing_database, "create"),
        "migrate-create",
        &runtime.to_string(),
        &application_migrate_script(runtime, &existing_database, "create"),
    ));
    application_package_json_scripts.migrate_down = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.migrate_down.as_ref(),
        &existing_runtime.to_string(),
        &application_migrate_script(&existing_runtime, &existing_database, "down"),
        "migrate-down",
        &runtime.to_string(),
        &application_migrate_script(runtime, &existing_database, "down"),
    ));
    application_package_json_scripts.migrate_init = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.migrate_init.as_ref(),
        &existing_runtime.to_string(),
        &application_migrate_script(&existing_runtime, &existing_database, "init"),
        "migrate-init",
        &runtime.to_string(),
        &application_migrate_script(runtime, &existing_database, "init"),
    ));
    application_package_json_scripts.migrate_up = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.migrate_up.as_ref(),
        &existing_runtime.to_string(),
        &application_migrate_script(&existing_runtime, &existing_database, "up"),
        "migrate-up",
        &runtime.to_string(),
        &application_migrate_script(runtime, &existing_database, "up"),
    ));
    application_package_json_scripts.seed = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.seed.as_ref(),
        &existing_runtime.to_string(),
        &application_seed_script(&existing_runtime, &existing_database),
        "seed",
        &runtime.to_string(),
        &application_seed_script(runtime, &existing_database),
    ));
    application_package_json_scripts.up_packages = Some(attempt_replacement(
        &mut application_package_json_scripts.additional_scripts,
        application_package_json_scripts.up_packages.as_ref(),
        &existing_runtime.to_string(),
        &application_up_packages_script(&existing_runtime),
        "up-packages",
        &runtime.to_string(),
        &application_up_packages_script(runtime),
    ));

    let mut is_in_memory_database = manifest_data.is_in_memory_database;
    for (project_name, project) in project_jsons_to_write {
        let project_entry = manifest_data
            .projects
            .iter()
            .find(|project_entry| &project_entry.name == project_name)
            .unwrap();
        let project_type = &project_entry.r#type;
        let is_database_enabled = if let Some(resources) = &project_entry.resources {
            if let Some(database) = &resources.database {
                is_in_memory_database = match database.parse::<Database>()? {
                    Database::SQLite => true,
                    Database::LibSQL => true,
                    Database::BetterSQLite => true,
                    _ => false,
                };
            }
            resources.database.is_some()
        } else {
            false
        };

        if let Some(project_scripts) = &mut project.scripts {
            project_scripts.clean = Some(attempt_replacement(
                &mut project_scripts.additional_scripts,
                project_scripts.clean.as_ref(),
                &existing_runtime.to_string(),
                &project_clean_script(&existing_runtime),
                "clean",
                &runtime.to_string(),
                &project_clean_script(runtime),
            ));
            match project_type {
                ProjectType::Service => {
                    project_scripts.dev = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.dev.as_ref(),
                        &existing_runtime.to_string(),
                        &project_dev_server_script(&existing_runtime, true),
                        "dev",
                        &runtime.to_string(),
                        &project_dev_server_script(runtime, true),
                    ));
                    project_scripts.dev_local = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.dev_local.as_ref(),
                        &existing_runtime.to_string(),
                        &project_dev_local_script(&existing_runtime),
                        "dev-local",
                        &runtime.to_string(),
                        &project_dev_local_script(runtime),
                    ));
                    project_scripts.start = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.start.as_ref(),
                        &existing_runtime.to_string(),
                        &project_start_server_script(&existing_runtime, true),
                        "start",
                        &runtime.to_string(),
                        &project_start_server_script(runtime, true),
                    ));
                }
                ProjectType::Worker => {
                    project_scripts.dev_server = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.dev_server.as_ref(),
                        &existing_runtime.to_string(),
                        &project_dev_server_script(&existing_runtime, is_database_enabled),
                        "dev-server",
                        &runtime.to_string(),
                        &project_dev_server_script(runtime, is_database_enabled),
                    ));

                    project_scripts.dev_worker = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.dev_worker.as_ref(),
                        &existing_runtime.to_string(),
                        &project_dev_worker_client_script(&existing_runtime),
                        "dev-client",
                        &runtime.to_string(),
                        &project_dev_worker_client_script(runtime),
                    ));

                    project_scripts.start_server = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.start_server.as_ref(),
                        &existing_runtime.to_string(),
                        &project_start_server_script(&existing_runtime, is_database_enabled),
                        "start-server",
                        &runtime.to_string(),
                        &project_start_server_script(runtime, is_database_enabled),
                    ));

                    project_scripts.start_worker = Some(attempt_replacement(
                        &mut project_scripts.additional_scripts,
                        project_scripts.start_worker.as_ref(),
                        &existing_runtime.to_string(),
                        &project_start_worker_script(&existing_runtime, is_database_enabled),
                        "start-worker",
                        &runtime.to_string(),
                        &project_start_worker_script(runtime, is_database_enabled),
                    ));
                }
                ProjectType::Library => {}
            }
        }
    }

    if runtime == &Runtime::Bun {
        application_json_to_write.workspaces = Some(existing_workspaces);
    } else if runtime == &Runtime::Node {
        rendered_templates_cache.insert(
            "pnpm-workspace.yaml".to_string(),
            RenderedTemplate {
                path: base_path.join("pnpm-workspace.yaml"),
                content: serde_yml::to_string(&existing_workspaces)?,
                context: None,
            },
        );
    }

    let dockerfile_template_path = TEMPLATES_DIR
        .get_file(Path::new("application").join("Dockerfile"))
        .unwrap();

    let dockerfile_template = Template::new(
        dockerfile_template_path
            .path()
            .file_name()
            .unwrap()
            .to_string_lossy(),
    )?;

    let existing_service_manifest_data = ServiceManifestData {
        is_in_memory_database: is_in_memory_database,
        is_node: existing_runtime == Runtime::Node,
        is_bun: existing_runtime == Runtime::Bun,
        ..serde_json::from_value(serde_json::to_value(&manifest_data)?)?
    };

    let existing_dockerfile_contents = read_to_string(base_path.join("Dockerfile"))?;
    let watermarked_dockerfile_contents = apply_watermark(&RenderedTemplate {
        path: base_path.join("Dockerfile"),
        content: dockerfile_template.render(&existing_service_manifest_data),
        context: None,
    })?;

    if existing_dockerfile_contents != watermarked_dockerfile_contents {
        rendered_templates_cache.insert(
            base_path.join("Dockerfile").to_string_lossy(),
            RenderedTemplate {
                path: base_path.join(format!("Dockerfile.{}", runtime.to_string())),
                content: existing_dockerfile_contents,
                context: None,
            },
        );
    }

    let dockerfile_cache_key = base_path.join("Dockerfile");
    rendered_templates_cache.insert(
        dockerfile_cache_key.to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("Dockerfile"),
            content: if exists(base_path.join(format!("Dockerfile.{}", runtime.to_string())))? {
                read_to_string(base_path.join(format!("Dockerfile.{}", runtime.to_string())))?
            } else {
                let service_manifest_data = ServiceManifestData {
                    is_in_memory_database,
                    is_node: runtime == &Runtime::Node,
                    is_bun: runtime == &Runtime::Bun,
                    ..serde_json::from_value(serde_json::to_value(&manifest_data)?)?
                };

                let dockerfile_contents = rendered_templates_cache
                    .get(&dockerfile_cache_key)?
                    .unwrap();

                update_dockerfile_contents(
                    dockerfile_contents.content.as_str(),
                    &service_manifest_data,
                )?
            },
            context: None,
        },
    );

    Ok(removal_templates)
}

fn change_test_framework(
    base_path: &Path,
    test_framework: &Option<TestFramework>,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut ApplicationPackageJson,
    project_jsons_to_write: &mut HashMap<String, ProjectPackageJson>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Vec<RemovalTemplate>> {
    let existing_test_framework =
        if let Some(manifest_test_framework) = manifest_data.test_framework.clone() {
            Some(manifest_test_framework.parse::<TestFramework>()?)
        } else {
            None
        };

    manifest_data.test_framework = if let Some(test_framework) = test_framework {
        Some(test_framework.to_string())
    } else {
        None
    };

    let mut removal_templates = vec![];

    let dev_dependencies = application_json_to_write.dev_dependencies.as_mut().unwrap();

    dev_dependencies.jest = None;
    dev_dependencies.ts_jest = None;
    dev_dependencies.vitest = None;
    dev_dependencies.types_jest = None;

    let scripts = application_json_to_write.scripts.as_mut().unwrap();

    scripts.test = None;

    for project in project_jsons_to_write.values_mut() {
        let project_scripts = project.scripts.as_mut().unwrap();
        project_scripts.test = None;
    }

    let runtime = manifest_data.runtime.parse::<Runtime>()?;

    if runtime == Runtime::Bun {
        for file in TestFramework::ALL_FILES {
            let config_file = base_path.join(file);
            let config_file_contents = read_to_string(&config_file)?;
            let watermarked_config_file_contents = apply_watermark(&RenderedTemplate {
                path: config_file.clone(),
                content: TEMPLATES_DIR
                    .get_file(Path::new("application").join(file))
                    .unwrap()
                    .contents_utf8()
                    .unwrap()
                    .to_string(),
                context: None,
            })?;
            if exists(&config_file)? && config_file_contents == watermarked_config_file_contents {
                removal_templates.push(RemovalTemplate { path: config_file });
            }
        }

        return Ok(removal_templates);
    }

    if scripts.test == Some(application_test_script(&runtime, &existing_test_framework)) {
        scripts.additional_scripts.insert(
            format!("test:{}", existing_test_framework.unwrap().to_string()),
            scripts.test.as_ref().unwrap().to_owned(),
        );
    }

    let modified_test_script_key = format!("test:{}", test_framework.unwrap().to_string());
    scripts.test = if scripts
        .additional_scripts
        .contains_key(&modified_test_script_key)
    {
        Some(
            scripts
                .additional_scripts
                .get(&modified_test_script_key)
                .unwrap()
                .to_owned(),
        )
    } else {
        Some(application_test_script(&runtime, test_framework))
    };

    for project in project_jsons_to_write.values_mut() {
        let project_scripts = project.scripts.as_mut().unwrap();
        if project_scripts.test == project_test_script(&runtime, &existing_test_framework) {
            project_scripts.additional_scripts.insert(
                format!("test:{}", existing_test_framework.unwrap().to_string()),
                project_scripts.test.as_ref().unwrap().to_owned(),
            );
        }
        let modified_test_script_key = format!("test:{}", test_framework.unwrap().to_string());
        project_scripts.test = if project_scripts
            .additional_scripts
            .contains_key(&modified_test_script_key)
        {
            Some(
                project_scripts
                    .additional_scripts
                    .get(&modified_test_script_key)
                    .unwrap()
                    .to_owned(),
            )
        } else {
            project_test_script(&runtime, test_framework)
        };
    }

    match test_framework {
        Some(TestFramework::Vitest) => {
            dev_dependencies.vitest = Some(VITEST_VERSION.to_string());

            let vitest_config_file_contents = TEMPLATES_DIR
                .get_file(Path::new("application").join("vitest.config.ts"))
                .unwrap()
                .contents_utf8()
                .unwrap();

            rendered_templates_cache.insert(
                base_path.join("vitest.config.ts").to_string_lossy(),
                RenderedTemplate {
                    path: base_path.join("vitest.config.ts"),
                    content: vitest_config_file_contents.to_string(),
                    context: None,
                },
            );
        }
        Some(TestFramework::Jest) => {
            dev_dependencies.jest = Some(JEST_VERSION.to_string());
            dev_dependencies.ts_jest = Some(TS_JEST_VERSION.to_string());
            dev_dependencies.types_jest = Some(TS_JEST_VERSION.to_string());

            let jest_config_file_contents = TEMPLATES_DIR
                .get_file(Path::new("application").join("jest.config.ts"))
                .unwrap()
                .contents_utf8()
                .unwrap();

            rendered_templates_cache.insert(
                base_path.join("jest.config.ts").to_string_lossy(),
                RenderedTemplate {
                    path: base_path.join("jest.config.ts"),
                    content: jest_config_file_contents.to_string(),
                    context: None,
                },
            );
        }
        None => (),
    };

    Ok(removal_templates)
}

fn change_author(
    author: &str,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut ApplicationPackageJson,
) {
    manifest_data.author = author.to_string();
    application_json_to_write.author = Some(author.to_string());
}

fn change_license(
    base_path: &Path,
    license: &License,
    manifest_data: &mut ApplicationManifestData,
    application_json_to_write: &mut ApplicationPackageJson,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Option<RemovalTemplate>> {
    manifest_data.license = license.to_string();
    let license_path = base_path.join("LICENSE");

    let mut removal_template = None;
    if exists(&license_path)? {
        removal_template = Some(RemovalTemplate { path: license_path });
    }

    application_json_to_write.license = Some(license.to_string());
    let license_file_key = base_path.join("LICENSE");

    if let Some(license_file_contents) =
        generate_license(base_path.to_str().unwrap(), &manifest_data)?
    {
        rendered_templates_cache.insert(license_file_key.to_string_lossy(), license_file_contents);
    }

    Ok(removal_template)
}

impl CliCommand for ApplicationCommand {
    fn command(&self) -> Command {
        command("application", "Change a forklaunch Application")
            .alias("app")
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
                    .help("The http framework to use")
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
            &BasePathLocation::Application,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data: ApplicationManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let name = matches.get_one::<String>("name");
        let formatter = matches.get_one::<String>("formatter");
        let linter = matches.get_one::<String>("linter");
        let validator = matches.get_one::<String>("validator");
        let runtime = matches.get_one::<String>("runtime");
        let http_framework = matches.get_one::<String>("http-framework");
        let test_framework = matches.get_one::<String>("test-framework");
        let description = matches.get_one::<String>("description");
        let author = matches.get_one::<String>("author");
        let license = matches.get_one::<String>("license");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if matches.ids().all(|id| id == "dryrun") {
            let options = vec![
                "name",
                "formatter",
                "linter",
                "http-framework",
                "runtime",
                "validator",
                "test-framework",
                "description",
                "author",
                "license",
            ];

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

        let runtime = prompt_field_from_selections_with_validation(
            "runtime",
            runtime,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter runtime: ",
            Some(&Runtime::VARIANTS),
            |input| Runtime::VARIANTS.contains(&input),
            |_| "Invalid runtime. Please try again".to_string(),
        )?;

        let http_framework = prompt_field_from_selections_with_validation(
            "http-framework",
            http_framework,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter HTTP framework: ",
            Some(&HttpFramework::VARIANTS),
            |input| {
                HttpFramework::VARIANTS.contains(&input)
                    && !(runtime == Some("bun".to_string()) && input == "hyper-express")
            },
            |input| {
                if runtime == Some("bun".to_string()) && input == "hyper-express" {
                    "Hyper Express is not supported for bun".to_string()
                } else {
                    "Invalid HTTP framework. Please try again".to_string()
                }
            },
        )?;

        let formatter = prompt_field_from_selections_with_validation(
            "formatter",
            formatter,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter formatter: ",
            Some(&Formatter::VARIANTS),
            |input| Formatter::VARIANTS.contains(&input),
            |_| "Invalid formatter. Please try again".to_string(),
        )?;

        let linter = prompt_field_from_selections_with_validation(
            "linter",
            linter,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter linter: ",
            Some(&Linter::VARIANTS),
            |input| Linter::VARIANTS.contains(&input),
            |_| "Invalid linter. Please try again".to_string(),
        )?;

        let validator = prompt_field_from_selections_with_validation(
            "validator",
            validator,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter validator: ",
            Some(&Validator::VARIANTS),
            |input| Validator::VARIANTS.contains(&input),
            |_| "Invalid validator. Please try again".to_string(),
        )?;

        let test_framework = prompt_field_from_selections_with_validation(
            "test-framework",
            test_framework,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter test framework: ",
            Some(&TestFramework::VARIANTS),
            |input| TestFramework::VARIANTS.contains(&input),
            |_| "Invalid test framework. Please try again".to_string(),
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

        let author = prompt_field_from_selections_with_validation(
            "author",
            author,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter author name: ",
            None,
            |input: &str| !input.is_empty(),
            |_| "Author name cannot be empty. Please try again".to_string(),
        )?;

        let license = prompt_field_from_selections_with_validation(
            "license",
            license,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter license: ",
            Some(&License::VARIANTS),
            |input: &str| match_license(input.parse().unwrap()).is_ok(),
            |_| "Invalid license. Please try again".to_string(),
        )?;

        let mut removal_templates = vec![];
        let mut symlink_templates = vec![];

        let application_package_json_path = base_path.join("package.json");
        let application_package_json_data = read_to_string(&application_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;

        let mut application_json_to_write =
            serde_json::from_str::<ApplicationPackageJson>(&application_package_json_data)?;

        let mut project_jsons_to_write: HashMap<String, ProjectPackageJson> = manifest_data
            .projects
            .iter()
            .map(|project| {
                let project_package_json_path = base_path.join(&project.name).join("package.json");
                let project_package_json_data = read_to_string(&project_package_json_path)
                    .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)
                    .unwrap();

                (
                    project.name.clone(),
                    serde_json::from_str::<ProjectPackageJson>(&project_package_json_data).unwrap(),
                )
            })
            .collect();

        if let Some(name) = name {
            change_name(
                &mut manifest_data,
                &base_path,
                &name,
                &mut application_json_to_write,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;

            let confirm = Confirm::new()
                .with_prompt("Would you like to rename the application path? (You will be directed if it is the current working directory)")
                .interact()?;

            if confirm {
                let cwd = std::env::current_dir()?;

                std::process::Command::new("mv")
                    .current_dir(&base_path.parent().unwrap())
                    .arg(&base_path)
                    .arg(&name)
                    .output()?;

                if cwd == base_path {
                    std::env::set_current_dir(Path::new(&name))?;
                }
            }
        }

        if let Some(formatter) = formatter {
            let (formatter_removal_templates, formatter_symlink_templates) = change_formatter(
                &base_path,
                &formatter.parse()?,
                &mut manifest_data,
                &mut application_json_to_write,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;
            removal_templates.extend(formatter_removal_templates);
            symlink_templates.extend(formatter_symlink_templates);
        }

        if let Some(linter) = linter {
            let (linter_removal_templates, linter_symlink_templates) = change_linter(
                &base_path,
                &linter.parse()?,
                &mut manifest_data,
                &mut application_json_to_write,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;
            removal_templates.extend(linter_removal_templates);
            symlink_templates.extend(linter_symlink_templates);
        }

        if let Some(validator) = validator {
            change_validator(
                &base_path,
                &validator.parse()?,
                &mut manifest_data,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;
        }

        if let Some(http_framework) = http_framework {
            change_http_framework(
                &base_path,
                &http_framework.parse()?,
                &mut manifest_data,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;
        }

        if let Some(runtime) = runtime {
            let confirm = Confirm::new()
                .with_prompt("Changing the runtime will remove existing runtime files (clean). Are you sure you want to continue?")
                .interact()?;

            if confirm {
                let command = match runtime.parse()? {
                    Runtime::Node => "pnpm clean:purge",
                    Runtime::Bun => "bun clean:purge",
                };
                let _ = std::process::Command::new(command)
                    .current_dir(base_path)
                    .output()?;
            } else {
                return Ok(());
            }

            let runtime_removal_templates = change_runtime(
                &mut line_editor,
                &mut stdout,
                matches,
                &base_path,
                &runtime.parse()?,
                &mut manifest_data,
                &mut application_json_to_write,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;
            removal_templates.extend(runtime_removal_templates);
        }

        if let Some(test_framework) = test_framework {
            let test_framework_removal_templates = change_test_framework(
                &base_path,
                &Some(test_framework.parse::<TestFramework>()?),
                &mut manifest_data,
                &mut application_json_to_write,
                &mut project_jsons_to_write,
                &mut rendered_templates_cache,
            )?;

            removal_templates.extend(test_framework_removal_templates);
        }

        if let Some(description) = description {
            change_description(&description, &mut application_json_to_write);
        }

        if let Some(author) = author {
            change_author(&author, &mut manifest_data, &mut application_json_to_write);
        }

        if let Some(license) = license {
            let removal_template = change_license(
                &base_path,
                &license.parse()?,
                &mut manifest_data,
                &mut application_json_to_write,
                &mut rendered_templates_cache,
            )?;

            if let Some(removal_template) = removal_template {
                removal_templates.push(removal_template);
            }
        }

        rendered_templates_cache.insert(
            config_path.to_string_lossy(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            base_path.join("package.json").to_string_lossy(),
            RenderedTemplate {
                path: base_path.join("package.json"),
                content: serde_json::to_string_pretty(&application_json_to_write)?,
                context: None,
            },
        );

        let rendered_templates: Vec<RenderedTemplate> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;
        remove_template_files(&removal_templates, dryrun, &mut stdout)?;
        create_symlinks(&symlink_templates, dryrun, &mut stdout)?;

        Ok(())
    }
}
