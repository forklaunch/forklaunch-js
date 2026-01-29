use std::{
    collections::{HashMap, hash_map::Entry},
    fs::{self, create_dir_all, read_to_string},
    io::Write,
    path::Path,
};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use serde::Serialize;
use serde_json::Value;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::to_string_pretty;

use super::{
    git::{get_git_branch, get_git_commit, is_git_repo},
    manifest_generator::{
        EnvironmentVariableComponent, EnvironmentVariableComponentProperty,
        EnvironmentVariableComponentType, EnvironmentVariableRequirement, EnvironmentVariableScope,
        ReleaseManifest, generate_release_manifest,
    },
};
use crate::{
    CliCommand,
    constants::get_platform_management_api_url,
    core::{
        ast::infrastructure::{
            env::find_all_env_vars,
            integrations::find_all_integrations,
            runtime_deps::{find_all_runtime_deps, get_unique_resource_types},
            service_dependencies::find_all_service_dependencies,
        },
        base_path::{RequiredLocation, find_app_root_path},
        command::command,
        docker::{DockerCompose, find_docker_compose_path},
        env::{find_workspace_root, get_modules_path},
        env_scope::determine_env_var_scopes,
        manifest::{ProjectType, application::ApplicationManifestData},
        openapi_export::export_all_services,
        rendered_template::RenderedTemplatesCache,
        token::get_token,
    },
};

#[derive(Debug, Serialize)]
struct CreateReleaseRequest {
    #[serde(rename = "applicationId")]
    application_id: String,
    manifest: ReleaseManifest,
    #[serde(rename = "releasedBy", skip_serializing_if = "Option::is_none")]
    released_by: Option<String>,
}

#[derive(Debug)]
pub(crate) struct CreateCommand;

impl CreateCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for CreateCommand {
    fn command(&self) -> Command {
        command("create", "Create a new release")
            .disable_version_flag(true)
            .arg(
                Arg::new("release_version")
                    .long("version")
                    .short('v')
                    .required(true)
                    .help("Release version (e.g., 1.0.0)"),
            )
            .arg(
                Arg::new("notes")
                    .long("notes")
                    .short('n')
                    .help("Release notes (optional)"),
            )
            .arg(
                Arg::new("base_path")
                    .long("path")
                    .short('p')
                    .help("Path to application root (optional)"),
            )
            .arg(
                Arg::new("dry-run")
                    .long("dry-run")
                    .action(clap::ArgAction::SetTrue)
                    .help("Simulate release creation without uploading"),
            )
            .arg(
                Arg::new("local")
                    .long("local")
                    .action(clap::ArgAction::SetTrue)
                    .help("Package local code and upload to S3 (for CI/CD testing without GitHub)"),
            )
            .arg(
                Arg::new("skip-sync")
                    .long("skip-sync")
                    .action(clap::ArgAction::SetTrue)
                    .help("Skip automatic sync of projects with manifest before creating release"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        // Get version
        let version = matches
            .get_one::<String>("release_version")
            .ok_or_else(|| anyhow::anyhow!("Version is required"))?;

        let dry_run = matches.get_flag("dry-run");
        let local_mode = matches.get_flag("local");
        let skip_sync = matches.get_flag("skip-sync");

        // Find application root
        let (app_root, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root.join(".forklaunch").join("manifest.toml");

        // Read manifest
        let manifest_content = read_to_string(&manifest_path)
            .with_context(|| format!("Failed to read manifest at {:?}", manifest_path))?;

        let mut manifest: ApplicationManifestData =
            toml::from_str(&manifest_content).with_context(|| "Failed to parse manifest.toml")?;

        // Step 0: Sync projects with manifest (unless skipped)
        if !skip_sync {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
            writeln!(stdout, "[INFO] Syncing projects with manifest...")?;
            stdout.reset()?;
            writeln!(stdout)?;

            use crate::core::rendered_template::RenderedTemplatesCache;
            let mut rendered_templates_cache = RenderedTemplatesCache::new();

            // Perform sync with confirm_all=true to avoid prompts during release
            let changes_made = match crate::sync::all::sync_all_projects(
                &app_root,
                &mut manifest,
                &mut rendered_templates_cache,
                true, // confirm_all - no interactive prompts
                &std::collections::HashMap::new(),
                &mut stdout,
            ) {
                Ok(changed) => changed,
                Err(e) => {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                    writeln!(stdout, "[ERROR] Sync failed: {}", e)?;
                    stdout.reset()?;
                    bail!("Failed to sync projects with manifest: {}", e);
                }
            };

            if changes_made {
                // Update manifest.toml with synced data
                let updated_manifest_content = to_string_pretty(&manifest)
                    .with_context(|| "Failed to serialize updated manifest")?;
                std::fs::write(&manifest_path, updated_manifest_content)
                    .with_context(|| "Failed to write updated manifest")?;

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "[OK] Sync completed with changes")?;
                stdout.reset()?;

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)).set_bold(true))?;
                writeln!(stdout, "[WARN] Manifest was updated. Please commit the changes to manifest.toml")?;
                stdout.reset()?;
                writeln!(stdout)?;
            } else {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "[OK] Sync completed - no changes detected")?;
                stdout.reset()?;
                writeln!(stdout)?;
            }
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "[INFO] Skipping project sync (--skip-sync flag set)")?;
            stdout.reset()?;
            writeln!(stdout)?;
        }

        // Check if integrated with platform
        let application_id = manifest
            .platform_application_id
            .as_ref()
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Application not integrated with platform.\nRun: forklaunch integrate --app <app-id>"
                )
            })?
            .clone();

        // Skip git repository check if using local mode
        if !local_mode && manifest.git_repository.is_none() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "[INFO] Git repository URL not set in manifest")?;
            stdout.reset()?;

            print!("Enter git repository URL (e.g., https://github.com/user/repo.git): ");
            std::io::stdout().flush()?;

            let mut git_repo = String::new();
            std::io::stdin().read_line(&mut git_repo)?;
            let git_repo = git_repo.trim().to_string();

            if !git_repo.is_empty() {
                manifest.git_repository = Some(git_repo);

                let manifest_str =
                    to_string_pretty(&manifest).with_context(|| "Failed to serialize manifest")?;
                fs::write(&manifest_path, manifest_str)
                    .with_context(|| "Failed to write manifest")?;

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "[INFO] Git repository saved to manifest.toml")?;
                stdout.reset()?;
            }
        }

        if local_mode {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "[INFO] Using local mode - packaging code directly")?;
            stdout.reset()?;
        }

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
        writeln!(stdout, "[INFO] Creating release {}...", version)?;
        stdout.reset()?;
        writeln!(stdout)?;

        // Step 1: Detect git metadata
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "  Detecting git metadata...")?;
        stdout.flush()?;
        stdout.reset()?;

        let (git_commit, git_branch) = if is_git_repo() {
            let commit = get_git_commit()?;
            let branch = get_git_branch().ok();
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, " [OK]")?;
            stdout.reset()?;
            (commit, branch)
        } else if local_mode {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(
                stdout,
                " [WARN] Not a git repository (using local defaults)"
            )?;
            stdout.reset()?;
            ("local-build".to_string(), Some("local".to_string()))
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, " [WARN] Not a git repository")?;
            stdout.reset()?;
            bail!("Current directory is not a git repository. Initialize git first.");
        };

        writeln!(
            stdout,
            "[INFO] Commit: {} ({})",
            if git_commit == "local-build" {
                "local"
            } else {
                &git_commit[..8]
            },
            git_branch.as_deref().unwrap_or("unknown")
        )?;

        // Step 2: Export OpenAPI specs
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Exporting OpenAPI specifications...")?;
        stdout.flush()?;
        stdout.reset()?;

        let openapi_path = app_root.join(".forklaunch").join("openapi");
        create_dir_all(&openapi_path).with_context(|| "Failed to create openapi directory")?;

        let exported_services = export_all_services(&app_root, &manifest, &openapi_path)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} services)", exported_services.len())?;
        stdout.reset()?;

        let mut openapi_specs = HashMap::new();
        for project in &manifest.projects {
            let openapi_file = openapi_path.join(&project.name).join("openapi.json");
            if openapi_file.exists() {
                let content = read_to_string(&openapi_file)?;
                let spec: Value = serde_json::from_str(&content)?;
                openapi_specs.insert(project.name.clone(), spec);
            }
        }

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting required environment variables...")?;
        stdout.flush()?;
        stdout.reset()?;

        let workspace_root = find_workspace_root(&app_root)?;
        let modules_path = get_modules_path(&workspace_root)?;

        let rendered_templates_cache = RenderedTemplatesCache::new();
        let project_env_vars = find_all_env_vars(&modules_path, &rendered_templates_cache)?;

        let mut scoped_env_vars = determine_env_var_scopes(&project_env_vars, &manifest)?;

        let (mut env_var_components, docker_compose_env_vars) =
            build_env_var_component_map(app_root.as_path(), &manifest);

        // Add all env vars from docker-compose for each service/worker
        let mut existing_vars: std::collections::HashSet<(String, Option<String>)> =
            scoped_env_vars
                .iter()
                .map(|v| (v.name.clone(), v.scope_id.clone()))
                .collect();

        for (service_name, env_vars) in docker_compose_env_vars {
            let project_types: HashMap<String, ProjectType> = manifest
                .projects
                .iter()
                .map(|p| (p.name.clone(), p.r#type.clone()))
                .collect();

            let worker_alias_info = classify_worker_alias(&service_name, &project_types);

            let (scope, scope_id) =
                if let Some((component_type, base_worker_name)) = worker_alias_info {
                    match component_type {
                        EnvironmentVariableComponentType::Service => (
                            crate::core::env_scope::EnvironmentVariableScope::Service,
                            Some(format!("{}-service", base_worker_name)),
                        ),
                        EnvironmentVariableComponentType::Worker => (
                            crate::core::env_scope::EnvironmentVariableScope::Worker,
                            Some(format!("{}-worker", base_worker_name)),
                        ),
                        _ => continue,
                    }
                } else {
                    // Check if it's a direct project match
                    let project_type = manifest
                        .projects
                        .iter()
                        .find(|p| p.name == service_name)
                        .map(|p| &p.r#type);

                    match project_type {
                        Some(crate::core::manifest::ProjectType::Service) => (
                            crate::core::env_scope::EnvironmentVariableScope::Service,
                            Some(service_name.clone()),
                        ),
                        Some(crate::core::manifest::ProjectType::Worker) => (
                            crate::core::env_scope::EnvironmentVariableScope::Worker,
                            Some(service_name.clone()),
                        ),
                        _ => continue, // Skip if not a service or worker
                    }
                };

            for (key, _value) in env_vars {
                // Skip if already exists
                if existing_vars.contains(&(key.clone(), scope_id.clone())) {
                    continue;
                }

                // Handle PORT specially - ensure passthrough is set to "8000" in component map
                let key_upper = key.to_ascii_uppercase();
                if key_upper == "PORT" {
                    // Update or insert PORT with passthrough "8000"
                    let property = infer_component_property(&key_upper).unwrap_or_else(|| {
                        default_component_property(
                            &EnvironmentVariableComponentType::Service,
                            &key_upper,
                        )
                    });
                    env_var_components.insert(
                        key.clone(),
                        (
                            EnvironmentVariableComponentType::Service,
                            property,
                            None,
                            None,
                            Some("8000".to_string()),
                        ),
                    );
                }

                scoped_env_vars.push(crate::core::env_scope::ScopedEnvVar {
                    name: key.clone(),
                    scope: scope.clone(),
                    scope_id: scope_id.clone(),
                    used_by: vec![service_name.clone()],
                });

                existing_vars.insert((key, scope_id.clone()));
            }
        }

        // Only keep application-level variables if they match the allowed criteria
        scoped_env_vars.retain(|v| {
            if v.scope != crate::core::env_scope::EnvironmentVariableScope::Application {
                return true;
            }

            is_allowed_application_var(&v.name, &env_var_components)
        });

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} variables)", scoped_env_vars.len())?;
        stdout.reset()?;

        // Detect runtime dependencies
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting runtime dependencies...")?;
        stdout.flush()?;
        stdout.reset()?;

        let all_runtime_deps = find_all_runtime_deps(&modules_path, &rendered_templates_cache)?;

        // Convert to resource types per project
        let mut project_runtime_deps: HashMap<String, Vec<String>> = HashMap::new();
        for (project_name, deps) in &all_runtime_deps {
            let resource_types = get_unique_resource_types(deps);
            // Filter out "monitoring" as it's not a provisionable resource
            let filtered_types: Vec<String> = resource_types
                .into_iter()
                .filter(|t| t != "monitoring")
                .collect();
            if !filtered_types.is_empty() {
                project_runtime_deps.insert(project_name.clone(), filtered_types);
            }
        }

        let total_resources: usize = project_runtime_deps.values().map(|v| v.len()).sum();
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} resources)", total_resources)?;
        stdout.reset()?;

        // Detect integrations
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting integrations...")?;
        stdout.flush()?;
        stdout.reset()?;

        let all_integrations = find_all_integrations(&modules_path, &rendered_templates_cache)?;

        let total_integrations: usize = all_integrations.values().map(|v| v.len()).sum();
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} integrations)", total_integrations)?;
        stdout.reset()?;

        // Detect worker configurations
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting worker configurations...")?;
        stdout.flush()?;
        stdout.reset()?;

        let all_worker_configs =
            crate::core::ast::infrastructure::worker_config::find_all_worker_configs(
                &modules_path,
                &rendered_templates_cache,
            )?;

        let total_worker_configs = all_worker_configs.len();
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} workers)", total_worker_configs)?;
        stdout.reset()?;

        // Detect service mesh dependencies (SDK client imports between services)
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting service mesh connections...")?;
        stdout.flush()?;
        stdout.reset()?;

        let all_service_deps =
            find_all_service_dependencies(&modules_path, &rendered_templates_cache)?;

        let total_service_deps: usize = all_service_deps.values().map(|v| v.len()).sum();
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} connections)", total_service_deps)?;
        stdout.reset()?;

        let required_env_vars: Vec<EnvironmentVariableRequirement> = scoped_env_vars
            .iter()
            .map(|v| EnvironmentVariableRequirement {
                name: v.name.clone(),
                scope: match v.scope {
                    crate::core::env_scope::EnvironmentVariableScope::Application => {
                        EnvironmentVariableScope::Application
                    }
                    crate::core::env_scope::EnvironmentVariableScope::Service => {
                        EnvironmentVariableScope::Service
                    }
                    crate::core::env_scope::EnvironmentVariableScope::Worker => {
                        EnvironmentVariableScope::Worker
                    }
                },
                scope_id: v.scope_id.clone(),
                component: env_var_components.get(&v.name).map(
                    |(component_type, property, target, path, passthrough)| {
                        EnvironmentVariableComponent {
                            r#type: component_type.clone(),
                            property: property.clone(),
                            target: target.clone(),
                            path: path.clone(),
                            passthrough: passthrough.clone(),
                        }
                    },
                ),
            })
            .collect();

        let app_vars = scoped_env_vars
            .iter()
            .filter(|v| v.scope == crate::core::env_scope::EnvironmentVariableScope::Application)
            .count();
        let service_vars = scoped_env_vars
            .iter()
            .filter(|v| v.scope == crate::core::env_scope::EnvironmentVariableScope::Service)
            .count();
        let worker_vars = scoped_env_vars
            .iter()
            .filter(|v| v.scope == crate::core::env_scope::EnvironmentVariableScope::Worker)
            .count();
        if app_vars > 0 {
            writeln!(stdout, "[INFO] Application-level: {}", app_vars)?;
        }
        if service_vars > 0 {
            writeln!(stdout, "[INFO] Service-level: {}", service_vars)?;
        }
        if worker_vars > 0 {
            writeln!(stdout, "[INFO] Worker-level: {}", worker_vars)?;
        }

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Generating release manifest...")?;
        stdout.flush()?;
        stdout.reset()?;

        // Handle local mode: create tarball and upload to S3
        let code_source_url = if local_mode && !dry_run {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "\n[INFO] Packaging local code...")?;
            stdout.reset()?;

            // Create tarball
            let tarball_path = app_root.join(".forklaunch").join("release-code.tar.gz");
            super::s3_upload::create_app_tarball(&app_root, &tarball_path)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "[INFO] Tarball created")?;
            stdout.reset()?;

            // Get presigned upload URL from platform
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            write!(stdout, "[INFO] Getting upload URL from platform...")?;
            stdout.flush()?;
            stdout.reset()?;

            let upload_response =
                super::s3_upload::get_presigned_upload_url(&application_id, version)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, " [OK]")?;
            stdout.reset()?;

            // Upload tarball to S3
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            write!(stdout, "[INFO] Uploading code to S3...")?;
            stdout.flush()?;
            stdout.reset()?;

            super::s3_upload::upload_to_s3(&tarball_path, &upload_response.upload_url)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, " [OK]")?;
            stdout.reset()?;

            // Clean up tarball
            std::fs::remove_file(&tarball_path).ok();

            Some(upload_response.code_source_url)
        } else {
            None
        };

        let release_manifest = generate_release_manifest(
            &app_root,
            application_id.clone(),
            version.clone(),
            git_commit.clone(),
            git_branch.clone(),
            code_source_url,
            &manifest,
            &openapi_specs,
            required_env_vars,
            &project_runtime_deps,
            &all_integrations,
            &all_worker_configs,
            &all_service_deps,
        )?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK]")?;
        stdout.reset()?;

        if dry_run {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "\n  [DRY RUN] Skipping upload to platform")?;
            stdout.reset()?;

            let manifest_file = app_root.join(".forklaunch").join("release-manifest.json");
            std::fs::write(
                &manifest_file,
                serde_json::to_string_pretty(&release_manifest)?,
            )?;
            writeln!(
                stdout,
                "[INFO] Manifest written to: {}",
                manifest_file.display()
            )?;
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            write!(stdout, "[INFO] Uploading release to platform...")?;
            stdout.flush()?;
            stdout.reset()?;

            upload_release(&application_id, release_manifest)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, " [OK]")?;
            stdout.reset()?;

            manifest.release_version = Some(version.clone());
            manifest.release_git_commit = Some(git_commit.clone());
            manifest.release_git_branch = git_branch.clone();

            let updated_manifest = to_string_pretty(&manifest)
                .with_context(|| "Failed to serialize updated manifest")?;

            std::fs::write(&manifest_path, updated_manifest)
                .with_context(|| "Failed to write updated manifest")?;
        }

        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        writeln!(stdout, "[OK] Release {} created successfully!", version)?;
        stdout.reset()?;

        if !dry_run {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "\n[INFO] Next steps:")?;
            stdout.reset()?;
            writeln!(stdout, "  1. Set environment variables in Platform UI")?;
            writeln!(
                stdout,
                "  2. forklaunch deploy create --release {} --environment <env> --region <region>",
                version
            )?;
        }

        Ok(())
    }
}

fn upload_release(application_id: &str, manifest: ReleaseManifest) -> Result<()> {
    let _token = get_token()?;

    let request_body = CreateReleaseRequest {
        application_id: application_id.to_string(),
        manifest,
        released_by: None, // TODO: Get from token
    };

    let url = format!("{}/releases", get_platform_management_api_url());

    use crate::core::http_client;

    let response = http_client::post(&url, serde_json::to_value(&request_body)?)
        .with_context(|| "Failed to create release")?;

    let status = response.status();
    let response_body = response.text().unwrap_or_else(|_| "{}".to_string());

    let parsed_response: serde_json::Value = serde_json::from_str(&response_body)
        .unwrap_or_else(|_| serde_json::json!({ "raw": response_body }));

    if !status.is_success() {
        bail!(
            "Failed to create release: {} (Status: {})",
            parsed_response,
            status
        );
    }

    if let Some(warnings) = parsed_response.get("warnings") {
        if let Some(array) = warnings.as_array() {
            if !array.is_empty() {
                println!("\n[WARN] Release created with warnings:");
                for warning in array {
                    println!("  - {}", warning);
                }
            }
        }
    }

    Ok(())
}

fn build_env_var_component_map(
    app_root: &Path,
    manifest: &ApplicationManifestData,
) -> (
    HashMap<
        String,
        (
            EnvironmentVariableComponentType,
            EnvironmentVariableComponentProperty,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >,
    HashMap<String, Vec<(String, String)>>, // service/worker name -> vec of (key, value)
) {
    let mut mapping = HashMap::new();
    let mut docker_compose_env_vars: HashMap<String, Vec<(String, String)>> = HashMap::new();

    if let Some(compose_path) = manifest
        .docker_compose_path
        .as_ref()
        .map(|path| app_root.join(path))
        .filter(|path| path.exists())
        .or_else(|| {
            find_docker_compose_path(app_root).map(|relative_path| app_root.join(relative_path))
        })
        .or_else(|| {
            let default_yaml = app_root.join("docker-compose.yaml");
            if default_yaml.exists() {
                Some(default_yaml)
            } else {
                let default_yml = app_root.join("docker-compose.yml");
                if default_yml.exists() {
                    Some(default_yml)
                } else {
                    None
                }
            }
        })
    {
        if let Ok(contents) = read_to_string(&compose_path) {
            match serde_yml::from_str::<DockerCompose>(&contents) {
                Ok(docker_compose) => {
                    let project_types: HashMap<_, _> = manifest
                        .projects
                        .iter()
                        .map(|project| (project.name.clone(), project.r#type.clone()))
                        .collect();

                    let mut service_lookup: HashMap<
                        String,
                        (EnvironmentVariableComponentType, String),
                    > = HashMap::new();

                    for (compose_key, compose_service) in docker_compose.services.iter() {
                        if let Some((component_type, canonical_target)) =
                            classify_compose_service(compose_key, &project_types)
                        {
                            let is_worker =
                                matches!(&component_type, EnvironmentVariableComponentType::Worker);

                            insert_service_identifier(
                                &mut service_lookup,
                                compose_key,
                                &component_type,
                                &canonical_target,
                            );

                            if let Some(hostname) = &compose_service.hostname {
                                insert_service_identifier(
                                    &mut service_lookup,
                                    hostname,
                                    &component_type,
                                    &canonical_target,
                                );
                            }

                            if let Some(container_name) = &compose_service.container_name {
                                insert_service_identifier(
                                    &mut service_lookup,
                                    container_name,
                                    &component_type,
                                    &canonical_target,
                                );
                            }

                            if is_worker {
                                insert_service_identifier(
                                    &mut service_lookup,
                                    &canonical_target,
                                    &component_type,
                                    &canonical_target,
                                );
                            }
                        }
                    }

                    for (service_name, service) in docker_compose.services.iter() {
                        if let Some(environment) = &service.environment {
                            // Collect all env vars for this service/worker
                            let mut service_env_vars = Vec::new();

                            for (key, value) in environment.iter() {
                                // Store the env var for this service
                                service_env_vars.push((key.clone(), value.clone()));

                                // Infer component details
                                let mut passthrough = None;
                                let key_upper = key.to_ascii_uppercase();

                                // Handle PORT specially - set passthrough to "8000"
                                if key_upper == "PORT" {
                                    passthrough = Some("8000".to_string());
                                }

                                if let Some((
                                    component_type,
                                    property,
                                    target,
                                    path,
                                    inferred_passthrough,
                                )) = infer_component_details(
                                    service_name,
                                    service,
                                    &project_types,
                                    &service_lookup,
                                    key,
                                    value,
                                ) {
                                    // Use the passthrough from PORT handling if set
                                    let final_passthrough = passthrough.or(inferred_passthrough);

                                    match mapping.entry(key.clone()) {
                                        Entry::Vacant(entry) => {
                                            entry.insert((
                                                component_type,
                                                property,
                                                target,
                                                path,
                                                final_passthrough,
                                            ));
                                        }
                                        Entry::Occupied(mut entry) => {
                                            let current = entry.get();
                                            // Preserve existing passthrough unless we have a new one
                                            let passthrough = final_passthrough.clone().or_else(|| current.4.clone());
                                            entry.insert((
                                                component_type,
                                                property,
                                                target,
                                                path,
                                                passthrough,
                                            ));
                                        }
                                    }
                                } else if passthrough.is_some() {
                                    // PORT that wasn't inferred, but we want to set passthrough
                                    let property = infer_component_property(&key_upper)
                                        .unwrap_or_else(|| {
                                            default_component_property(
                                                &EnvironmentVariableComponentType::Service,
                                                &key_upper,
                                            )
                                        });
                                    mapping.insert(
                                        key.clone(),
                                        (
                                            EnvironmentVariableComponentType::Service,
                                            property,
                                            None,
                                            None,
                                            passthrough,
                                        ),
                                    );
                                }
                            }

                            if project_types.contains_key(service_name) {
                                docker_compose_env_vars
                                    .insert(service_name.clone(), service_env_vars);
                            } else if classify_worker_alias(service_name, &project_types).is_some()
                            {
                                docker_compose_env_vars
                                    .insert(service_name.clone(), service_env_vars);
                            }
                        }
                    }
                }
                Err(err) => {
                    eprintln!(
                        "Failed to parse docker-compose at {}: {err}",
                        compose_path.display()
                    );
                }
            }
        }
    }

    (mapping, docker_compose_env_vars)
}

fn classify_compose_service(
    compose_key: &str,
    project_types: &HashMap<String, ProjectType>,
) -> Option<(EnvironmentVariableComponentType, String)> {
    if let Some(project_type) = project_types.get(compose_key) {
        return match project_type {
            ProjectType::Service => Some((
                EnvironmentVariableComponentType::Service,
                compose_key.to_string(),
            )),
            ProjectType::Worker => Some((
                EnvironmentVariableComponentType::Worker,
                compose_key.to_string(),
            )),
            _ => None,
        };
    }

    classify_worker_alias(compose_key, project_types)
}

fn classify_worker_alias(
    compose_key: &str,
    project_types: &HashMap<String, ProjectType>,
) -> Option<(EnvironmentVariableComponentType, String)> {
    const WORKER_ALIAS_SUFFIXES: &[(&str, EnvironmentVariableComponentType)] = &[
        ("-worker", EnvironmentVariableComponentType::Worker),
        ("-service", EnvironmentVariableComponentType::Service),
        ("-server", EnvironmentVariableComponentType::Service),
    ];

    for (suffix, component_type) in WORKER_ALIAS_SUFFIXES {
        if let Some(base) = compose_key.strip_suffix(suffix) {
            if matches!(project_types.get(base), Some(ProjectType::Worker)) {
                return Some((component_type.clone(), base.to_string()));
            }
        }
    }

    None
}

fn infer_component_details(
    service_name: &str,
    service: &crate::core::docker::DockerService,
    project_types: &HashMap<String, ProjectType>,
    service_lookup: &HashMap<String, (EnvironmentVariableComponentType, String)>,
    key: &str,
    value: &str,
) -> Option<(
    EnvironmentVariableComponentType,
    EnvironmentVariableComponentProperty,
    Option<String>,
    Option<String>,
    Option<String>,
)> {
    let key_upper = key.to_ascii_uppercase();

    // Special handling for OTEL_EXPORTER_OTLP_ENDPOINT - set target to "otel"
    if key_upper == "OTEL_EXPORTER_OTLP_ENDPOINT" {
        let property = infer_component_property(&key_upper).unwrap_or_else(|| {
            default_component_property(&EnvironmentVariableComponentType::Service, &key_upper)
        });
        let path = extract_path_from_value(value);
        return Some((
            EnvironmentVariableComponentType::Service,
            property,
            Some("otel".to_string()),
            path,
            None,
        ));
    }

    if !is_url_like(value) && is_cli_generated_key_var(&key_upper) {
        if let Some(property) = infer_key_component_property(&key_upper, value) {
            return Some((
                EnvironmentVariableComponentType::Key,
                property,
                None,
                None,
                None,
            ));
        }
    }

    let service_hint = classify_compose_service(service_name, project_types);

    if let Some((component_type, target)) = infer_component_type(
        &key_upper,
        value,
        service_name,
        service.image.as_deref(),
        service.ports.as_ref().map(|ports| ports.as_slice()),
        service_hint.as_ref(),
        service_lookup,
    ) {
        let property = infer_component_property(&key_upper)
            .unwrap_or_else(|| default_component_property(&component_type, &key_upper));
        let path = extract_path_from_value(value);
        return Some((component_type, property, target, path, None));
    }

    if should_passthrough(key, value) {
        let property = infer_component_property(&key_upper).unwrap_or_else(|| {
            default_component_property(&EnvironmentVariableComponentType::Service, &key_upper)
        });
        let path = None;
        let passthrough_value = Some(value.to_string());
        return Some((
            EnvironmentVariableComponentType::Service,
            property,
            None,
            path,
            passthrough_value,
        ));
    }

    None
}

fn infer_component_property(key_upper: &str) -> Option<EnvironmentVariableComponentProperty> {
    let tokens: Vec<&str> = key_upper
        .split('_')
        .filter(|segment| !segment.is_empty())
        .collect();

    let contains = |needle: &str| tokens.iter().any(|token| *token == needle);

    if contains("CONNECTIONSTRING") || (contains("CONNECTION") && contains("STRING")) {
        Some(EnvironmentVariableComponentProperty::ConnectionString)
    } else if contains("CONNECTION") {
        Some(EnvironmentVariableComponentProperty::Connection)
    } else if contains("HOSTNAME") {
        Some(EnvironmentVariableComponentProperty::Hostname)
    } else if contains("HOST") {
        Some(EnvironmentVariableComponentProperty::Host)
    } else if contains("PORT") {
        Some(EnvironmentVariableComponentProperty::Port)
    } else if contains("URL") || contains("URI") {
        Some(EnvironmentVariableComponentProperty::Url)
    } else if contains("USERNAME") {
        Some(EnvironmentVariableComponentProperty::Username)
    } else if contains("USER") {
        Some(EnvironmentVariableComponentProperty::User)
    } else if contains("PASSWORD") {
        Some(EnvironmentVariableComponentProperty::Password)
    } else if (contains("DB") || contains("DATABASE")) && contains("NAME") {
        Some(EnvironmentVariableComponentProperty::DbName)
    } else if contains("DATABASE") || contains("DB") {
        Some(EnvironmentVariableComponentProperty::Database)
    } else if contains("FQDN") {
        Some(EnvironmentVariableComponentProperty::Fqdn)
    } else if contains("BUCKET") {
        Some(EnvironmentVariableComponentProperty::Bucket)
    } else if contains("ENDPOINT") {
        Some(EnvironmentVariableComponentProperty::Endpoint)
    } else if contains("REGION") {
        Some(EnvironmentVariableComponentProperty::Region)
    } else if contains("PATH") {
        Some(EnvironmentVariableComponentProperty::Endpoint)
    } else if contains("BROKER") || contains("BROKERS") || contains("QUEUE") {
        Some(EnvironmentVariableComponentProperty::Connection)
    } else if contains("SECRET") || contains("TOKEN") {
        Some(EnvironmentVariableComponentProperty::Password)
    } else if contains("ACCESS") && contains("KEY") {
        Some(EnvironmentVariableComponentProperty::User)
    } else if contains("CLIENT") {
        Some(EnvironmentVariableComponentProperty::User)
    } else {
        None
    }
}

fn infer_key_component_property(
    key_upper: &str,
    value: &str,
) -> Option<EnvironmentVariableComponentProperty> {
    if key_upper.contains("ENCRYPTION") || key_upper.contains("PRIVATE_KEY") {
        return Some(EnvironmentVariableComponentProperty::PrivatePem);
    }

    if key_upper.contains("PUBLIC_KEY") {
        return Some(EnvironmentVariableComponentProperty::PublicPem);
    }

    if looks_pem(value) {
        if value.contains("BEGIN PUBLIC KEY") {
            return Some(EnvironmentVariableComponentProperty::PublicPem);
        }
        if value.contains("BEGIN PRIVATE KEY") || value.contains("BEGIN ENCRYPTED PRIVATE KEY") {
            return Some(EnvironmentVariableComponentProperty::PrivatePem);
        }
    }

    if key_upper.contains("HMAC") {
        return Some(EnvironmentVariableComponentProperty::Base64Bytes32);
    }

    if key_upper.contains("JWT") {
        return Some(EnvironmentVariableComponentProperty::Base64Bytes32);
    }

    if key_upper.contains("ACCESS_KEY") || key_upper.contains("CLIENT_SECRET") {
        if looks_hex_key(value) {
            return Some(EnvironmentVariableComponentProperty::HexKey);
        }
        if looks_base64(value) && value.len() >= 60 {
            return Some(EnvironmentVariableComponentProperty::Base64Bytes64);
        }
        return Some(EnvironmentVariableComponentProperty::KeyMaterial);
    }

    if key_upper.contains("SECRET")
        || key_upper.contains("TOKEN")
        || key_upper.ends_with("_KEY")
        || key_upper.contains("API_KEY")
    {
        if looks_hex_key(value) {
            return Some(EnvironmentVariableComponentProperty::HexKey);
        }
        if looks_base64(value) {
            return Some(EnvironmentVariableComponentProperty::Base64Bytes32);
        }
        return Some(EnvironmentVariableComponentProperty::KeyMaterial);
    }

    None
}

fn default_component_property(
    component_type: &EnvironmentVariableComponentType,
    key_upper: &str,
) -> EnvironmentVariableComponentProperty {
    if key_upper.contains("HOST") {
        EnvironmentVariableComponentProperty::Host
    } else if key_upper.contains("PORT") {
        EnvironmentVariableComponentProperty::Port
    } else if key_upper.contains("URL") || key_upper.contains("URI") {
        EnvironmentVariableComponentProperty::Url
    } else if key_upper.contains("USER")
        || key_upper.contains("USERNAME")
        || key_upper.contains("CLIENT")
    {
        EnvironmentVariableComponentProperty::User
    } else if key_upper.contains("PASSWORD")
        || key_upper.contains("SECRET")
        || key_upper.contains("TOKEN")
    {
        EnvironmentVariableComponentProperty::Password
    } else {
        match component_type {
            EnvironmentVariableComponentType::ObjectStore => {
                EnvironmentVariableComponentProperty::Endpoint
            }
            EnvironmentVariableComponentType::Key => {
                EnvironmentVariableComponentProperty::KeyMaterial
            }
            _ => EnvironmentVariableComponentProperty::Connection,
        }
    }
}

fn infer_component_type(
    key_upper: &str,
    value: &str,
    service_name: &str,
    service_image: Option<&str>,
    service_ports: Option<&[String]>,
    service_hint: Option<&(EnvironmentVariableComponentType, String)>,
    service_lookup: &HashMap<String, (EnvironmentVariableComponentType, String)>,
) -> Option<(EnvironmentVariableComponentType, Option<String>)> {
    let value_lower = value.to_ascii_lowercase();
    let service_lower = service_name.to_ascii_lowercase();
    let image_lower = service_image.map(|image| image.to_ascii_lowercase());

    const DATABASE_KEY_HINTS: &[&str] = &[
        "DB_", "DATABASE", "POSTGRES", "MYSQL", "MARIADB", "MSSQL", "PG", "SQLITE",
    ];
    const DATABASE_VALUE_HINTS: &[&str] = &[
        "postgres",
        "postgresql",
        "mysql",
        "mariadb",
        "mssql",
        "sqlserver",
        "sqlite",
        "cockroach",
    ];
    const DATABASE_IMAGE_HINTS: &[&str] = &[
        "postgres",
        "postgresql",
        "mysql",
        "mariadb",
        "mssql",
        "sqlserver",
        "mongo",
        "mongodb",
        "cockroach",
        "timescale",
    ];
    if matches_hints(
        key_upper,
        &value_lower,
        &service_lower,
        image_lower.as_deref(),
        DATABASE_KEY_HINTS,
        DATABASE_VALUE_HINTS,
        DATABASE_IMAGE_HINTS,
    ) {
        return Some((EnvironmentVariableComponentType::Database, None));
    }

    const CACHE_KEY_HINTS: &[&str] = &["REDIS", "CACHE", "MEMCACHE", "MEMCACHED"];
    const CACHE_VALUE_HINTS: &[&str] = &["redis", "cache", "memcache", "memcached"];
    const CACHE_IMAGE_HINTS: &[&str] = &["redis", "memcache", "memcached"];
    if matches_hints(
        key_upper,
        &value_lower,
        &service_lower,
        image_lower.as_deref(),
        CACHE_KEY_HINTS,
        CACHE_VALUE_HINTS,
        CACHE_IMAGE_HINTS,
    ) {
        return Some((EnvironmentVariableComponentType::Cache, None));
    }

    const OBJECT_STORE_KEY_HINTS: &[&str] = &["S3", "MINIO", "OBJECT", "BUCKET"];
    const OBJECT_STORE_VALUE_HINTS: &[&str] = &["s3", "minio", "object", "bucket"];
    const OBJECT_STORE_IMAGE_HINTS: &[&str] = &["minio", "localstack", "seaweedfs"];
    if matches_hints(
        key_upper,
        &value_lower,
        &service_lower,
        image_lower.as_deref(),
        OBJECT_STORE_KEY_HINTS,
        OBJECT_STORE_VALUE_HINTS,
        OBJECT_STORE_IMAGE_HINTS,
    ) {
        return Some((EnvironmentVariableComponentType::ObjectStore, None));
    }

    const QUEUE_KEY_HINTS: &[&str] = &[
        "QUEUE", "KAFKA", "BROKER", "BULLMQ", "RABBIT", "RABBITMQ", "NATS", "SQS",
    ];
    const QUEUE_VALUE_HINTS: &[&str] = &[
        "queue", "kafka", "broker", "bullmq", "rabbit", "rabbitmq", "nats", "sqs",
    ];
    const QUEUE_IMAGE_HINTS: &[&str] =
        &["kafka", "redpanda", "rabbitmq", "nats", "activemq", "sqs"];
    if matches_hints(
        key_upper,
        &value_lower,
        &service_lower,
        image_lower.as_deref(),
        QUEUE_KEY_HINTS,
        QUEUE_VALUE_HINTS,
        QUEUE_IMAGE_HINTS,
    ) {
        return Some((EnvironmentVariableComponentType::Queue, None));
    }

    if let Some((component_type, target)) = infer_service_reference(value, service_lookup) {
        return Some((component_type, target));
    }

    let has_generated_port = has_generated_app_port(service_ports);

    if has_generated_port && is_url_like(value) {
        if let Some((component_type_hint, canonical_target)) = service_hint {
            return Some((component_type_hint.clone(), Some(canonical_target.clone())));
        }
    }

    None
}

fn matches_hints(
    key_upper: &str,
    value_lower: &str,
    service_lower: &str,
    image_lower: Option<&str>,
    key_hints: &[&str],
    value_hints: &[&str],
    image_hints: &[&str],
) -> bool {
    key_hints.iter().any(|hint| key_upper.contains(hint))
        || value_hints.iter().any(|hint| value_lower.contains(hint))
        || value_hints.iter().any(|hint| service_lower.contains(hint))
        || image_hints
            .iter()
            .any(|hint| image_lower.map_or(false, |image| image.contains(hint)))
}

fn infer_service_reference(
    value: &str,
    service_lookup: &HashMap<String, (EnvironmentVariableComponentType, String)>,
) -> Option<(EnvironmentVariableComponentType, Option<String>)> {
    let parsed = parse_url(value)?;
    let host = parsed.host?;

    service_lookup
        .get(&host)
        .map(|(component_type, target)| (component_type.clone(), Some(target.clone())))
}

fn insert_service_identifier(
    lookup: &mut HashMap<String, (EnvironmentVariableComponentType, String)>,
    identifier: &str,
    component_type: &EnvironmentVariableComponentType,
    canonical_target: &str,
) {
    if identifier.is_empty() {
        return;
    }

    lookup
        .entry(identifier.to_ascii_lowercase())
        .or_insert((component_type.clone(), canonical_target.to_string()));
}

fn has_generated_app_port(service_ports: Option<&[String]>) -> bool {
    if let Some(ports) = service_ports {
        for binding in ports {
            for segment in binding.split(&[':', '/'][..]) {
                if let Ok(port) = segment.parse::<u16>() {
                    if (8000..9000).contains(&port) {
                        return true;
                    }
                }
            }
        }
    }

    false
}

fn is_url_like(value: &str) -> bool {
    parse_url(value).is_some()
}

fn should_passthrough(key: &str, value: &str) -> bool {
    if is_url_like(value) {
        return false;
    }

    let key_upper = key.to_ascii_uppercase();

    if infer_key_component_property(&key_upper, value).is_some() {
        return false;
    }

    if key_upper.contains("KEY")
        || key_upper.contains("TOKEN")
        || key_upper.contains("SECRET")
        || key_upper.contains("PASSWORD")
        || key_upper.contains("ACCESS")
    {
        return false;
    }

    if key_upper.contains("PORT") {
        return false;
    }

    // NODE_ENV should not be passthrough
    if key_upper == "NODE_ENV" {
        return false;
    }

    true
}

const CLI_GENERATED_KEY_VARS: &[&str] = &[
    "HMAC_SECRET_KEY",
    "PASSWORD_ENCRYPTION_SECRET",
    "INTERNAL_HMAC_SECRET",
];

fn is_cli_generated_key_var(key_upper: &str) -> bool {
    CLI_GENERATED_KEY_VARS
        .iter()
        .any(|allowed| allowed == &key_upper)
}

fn is_allowed_application_var(
    var_name: &str,
    components: &HashMap<
        String,
        (
            EnvironmentVariableComponentType,
            EnvironmentVariableComponentProperty,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >,
) -> bool {
    if let Some((component_type, property, _, _, _)) = components.get(var_name) {
        if matches!(
            component_type,
            EnvironmentVariableComponentType::Service | EnvironmentVariableComponentType::Worker
        ) && matches!(property, EnvironmentVariableComponentProperty::Url)
        {
            return true;
        }
    }

    let upper = var_name.to_ascii_uppercase();
    if upper.contains("HMAC") {
        return true;
    }

    if upper.contains("JWKS") && upper.contains("PUBLIC") && upper.contains("KEY") {
        return true;
    }

    false
}

struct ParsedUrl {
    host: Option<String>,
    path: Option<String>,
}

fn parse_url(value: &str) -> Option<ParsedUrl> {
    let scheme_split: Vec<&str> = value.splitn(2, "://").collect();
    if scheme_split.len() != 2 {
        return None;
    }

    let remainder = scheme_split[1];
    let mut host = remainder;
    let mut path_start = remainder.len();

    if let Some(idx) = remainder.find(&['/', '?', '#'][..]) {
        host = &remainder[..idx];
        path_start = idx;
    }

    let mut host_parts = host.splitn(2, ':');
    let hostname = host_parts
        .next()
        .map(|h| h.trim().trim_matches(|c: char| c == '[' || c == ']'))
        .filter(|h| !h.is_empty())
        .map(|h| h.to_ascii_lowercase());

    let path = if path_start < remainder.len() {
        Some(remainder[path_start..].to_string())
    } else {
        None
    };

    Some(ParsedUrl {
        host: hostname,
        path,
    })
}

fn extract_path_from_value(value: &str) -> Option<String> {
    parse_url(value).and_then(|parsed| parsed.path)
}

fn looks_pem(value: &str) -> bool {
    let trimmed = value.trim();
    trimmed.starts_with("-----BEGIN ") && trimmed.contains("-----END ")
}

fn looks_hex_key(value: &str) -> bool {
    let trimmed = value.trim();
    let hex_chars = trimmed.chars().all(|c| c.is_ascii_hexdigit());
    hex_chars && (trimmed.len() >= 32)
}

fn looks_base64(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.len() < 16 {
        return false;
    }
    trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || "+/=_-".contains(c))
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use super::*;
    use crate::core::manifest::{
        ProjectEntry, ResourceInventory, application::ApplicationManifestData,
    };

    fn create_test_manifest(projects: Vec<(&str, ProjectType)>) -> ApplicationManifestData {
        ApplicationManifestData {
            id: "test-id".to_string(),
            cli_version: "1.0.0".to_string(),
            app_name: "test-app".to_string(),
            camel_case_app_name: "testApp".to_string(),
            pascal_case_app_name: "TestApp".to_string(),
            kebab_case_app_name: "test-app".to_string(),
            title_case_app_name: "Test App".to_string(),
            modules_path: "src/modules".to_string(),
            docker_compose_path: Some("docker-compose.yaml".to_string()),
            dockerfile: None,
            git_repository: None,
            runtime: "node".to_string(),
            formatter: "prettier".to_string(),
            linter: "eslint".to_string(),
            validator: "zod".to_string(),
            http_framework: "express".to_string(),
            test_framework: None,
            app_description: "Test application".to_string(),
            author: "Test Author".to_string(),
            license: "MIT".to_string(),
            projects: projects
                .into_iter()
                .map(|(name, r#type)| ProjectEntry {
                    name: name.to_string(),
                    r#type,
                    description: format!("Test {}", name),
                    variant: None,
                    resources: Some(ResourceInventory {
                        database: None,
                        cache: None,
                        queue: None,
                        object_store: None,
                    }),
                    routers: None,
                    metadata: None,
                })
                .collect(),
            project_peer_topology: HashMap::new(),
            database: "postgresql".to_string(),
            is_postgres: true,
            is_sqlite: false,
            is_mysql: false,
            is_mariadb: false,
            is_better_sqlite: false,
            is_libsql: false,
            is_mssql: false,
            is_mongo: false,
            is_in_memory_database: false,
            is_eslint: true,
            is_biome: false,
            is_oxlint: false,
            is_prettier: true,
            is_express: true,
            is_hyper_express: false,
            is_zod: true,
            is_typebox: false,
            is_bun: false,
            is_node: true,
            is_vitest: false,
            is_jest: false,
            platform_application_id: None,
            platform_organization_id: None,
            release_version: None,
            release_git_commit: None,
            release_git_branch: None,
        }
    }

    fn create_test_docker_compose(services: Vec<(&str, Vec<(&str, &str)>)>) -> String {
        let mut yaml = "version: '3.8'\nservices:\n".to_string();
        for (service_name, env_vars) in services {
            yaml.push_str(&format!("  {}:\n", service_name));
            yaml.push_str("    image: test-image:latest\n");
            if !env_vars.is_empty() {
                yaml.push_str("    environment:\n");
                for (key, value) in env_vars {
                    yaml.push_str(&format!("      {}: {}\n", key, value));
                }
            }
        }
        yaml
    }

    #[test]
    fn test_build_env_var_component_map_collects_docker_compose_env_vars() {
        let temp_dir = TempDir::new().unwrap();
        let compose_path = temp_dir.path().join("docker-compose.yaml");

        let compose_content = create_test_docker_compose(vec![
            (
                "my-service",
                vec![
                    ("DB_HOST", "postgres"),
                    ("DB_PORT", "5432"),
                    ("PORT", "8080"),
                    ("HOST", "0.0.0.0"),
                ],
            ),
            (
                "my-worker",
                vec![
                    ("REDIS_HOST", "redis"),
                    ("REDIS_PORT", "6379"),
                    ("PORT", "9000"),
                ],
            ),
        ]);

        fs::write(&compose_path, compose_content).unwrap();

        let manifest = create_test_manifest(vec![
            ("my-service", ProjectType::Service),
            ("my-worker", ProjectType::Worker),
        ]);

        let (_components, docker_compose_env_vars) =
            build_env_var_component_map(temp_dir.path(), &manifest);

        // Verify docker-compose env vars are collected
        assert!(docker_compose_env_vars.contains_key("my-service"));
        assert!(docker_compose_env_vars.contains_key("my-worker"));

        let service_vars = docker_compose_env_vars.get("my-service").unwrap();
        assert_eq!(service_vars.len(), 4);
        let service_var_names: Vec<&String> = service_vars.iter().map(|(k, _)| k).collect();
        assert!(service_var_names.contains(&&"DB_HOST".to_string()));
        assert!(service_var_names.contains(&&"DB_PORT".to_string()));
        assert!(service_var_names.contains(&&"PORT".to_string()));
        assert!(service_var_names.contains(&&"HOST".to_string()));

        let worker_vars = docker_compose_env_vars.get("my-worker").unwrap();
        assert_eq!(worker_vars.len(), 3);
        let worker_var_names: Vec<&String> = worker_vars.iter().map(|(k, _)| k).collect();
        assert!(worker_var_names.contains(&&"REDIS_HOST".to_string()));
        assert!(worker_var_names.contains(&&"REDIS_PORT".to_string()));
        assert!(worker_var_names.contains(&&"PORT".to_string()));
    }

    #[test]
    fn test_build_env_var_component_map_sets_port_passthrough() {
        let temp_dir = TempDir::new().unwrap();
        let compose_path = temp_dir.path().join("docker-compose.yaml");

        let compose_content = create_test_docker_compose(vec![(
            "my-service",
            vec![("PORT", "8080"), ("HOST", "0.0.0.0")],
        )]);

        fs::write(&compose_path, compose_content).unwrap();

        let manifest = create_test_manifest(vec![("my-service", ProjectType::Service)]);

        let (components, _docker_compose_env_vars) =
            build_env_var_component_map(temp_dir.path(), &manifest);

        // Verify PORT has passthrough "8000"
        if let Some((_type, _property, _target, _path, passthrough)) = components.get("PORT") {
            assert_eq!(passthrough, &Some("8000".to_string()));
        } else {
            panic!("PORT should be in components map");
        }
    }

    #[test]
    fn test_docker_compose_env_vars_included_in_scoped_vars() {
        let temp_dir = TempDir::new().unwrap();
        let compose_path = temp_dir.path().join("docker-compose.yaml");

        let compose_content = create_test_docker_compose(vec![(
            "my-service",
            vec![
                ("DB_HOST", "postgres"),
                ("PORT", "8080"),
                ("HOST", "0.0.0.0"),
            ],
        )]);

        fs::write(&compose_path, compose_content).unwrap();

        let manifest = create_test_manifest(vec![("my-service", ProjectType::Service)]);

        let (mut components, docker_compose_env_vars) =
            build_env_var_component_map(temp_dir.path(), &manifest);

        // Simulate the logic from the main function
        let mut scoped_env_vars = Vec::new();
        let mut existing_vars: std::collections::HashSet<(String, Option<String>)> =
            std::collections::HashSet::new();

        for (service_name, env_vars) in docker_compose_env_vars {
            let project_type = manifest
                .projects
                .iter()
                .find(|p| p.name == service_name)
                .map(|p| &p.r#type);

            let (scope, scope_id) = match project_type {
                Some(ProjectType::Service) => (
                    crate::core::env_scope::EnvironmentVariableScope::Service,
                    Some(service_name.clone()),
                ),
                Some(ProjectType::Worker) => (
                    crate::core::env_scope::EnvironmentVariableScope::Worker,
                    Some(service_name.clone()),
                ),
                _ => continue,
            };

            for (key, _value) in env_vars {
                if existing_vars.contains(&(key.clone(), scope_id.clone())) {
                    continue;
                }

                let key_upper = key.to_ascii_uppercase();
                if key_upper == "PORT" {
                    let property = infer_component_property(&key_upper).unwrap_or_else(|| {
                        default_component_property(
                            &EnvironmentVariableComponentType::Service,
                            &key_upper,
                        )
                    });
                    components.insert(
                        key.clone(),
                        (
                            EnvironmentVariableComponentType::Service,
                            property,
                            None,
                            None,
                            Some("8000".to_string()),
                        ),
                    );
                }

                scoped_env_vars.push(crate::core::env_scope::ScopedEnvVar {
                    name: key.clone(),
                    scope: scope.clone(),
                    scope_id: scope_id.clone(),
                    used_by: vec![service_name.clone()],
                });

                existing_vars.insert((key, scope_id.clone()));
            }
        }

        // Verify env vars are in scoped_env_vars
        assert_eq!(scoped_env_vars.len(), 3);

        let var_names: Vec<&String> = scoped_env_vars.iter().map(|v| &v.name).collect();
        assert!(var_names.contains(&&"DB_HOST".to_string()));
        assert!(var_names.contains(&&"PORT".to_string()));
        assert!(var_names.contains(&&"HOST".to_string()));

        // Verify they're scoped to the service
        for var in &scoped_env_vars {
            assert_eq!(
                var.scope,
                crate::core::env_scope::EnvironmentVariableScope::Service
            );
            assert_eq!(var.scope_id, Some("my-service".to_string()));
        }

        // Verify PORT has passthrough in components
        if let Some((_type, _property, _target, _path, passthrough)) = components.get("PORT") {
            assert_eq!(passthrough, &Some("8000".to_string()));
        } else {
            panic!("PORT should be in components map with passthrough");
        }
    }

    #[test]
    fn test_docker_compose_env_vars_not_duplicated() {
        let temp_dir = TempDir::new().unwrap();
        let compose_path = temp_dir.path().join("docker-compose.yaml");

        let compose_content = create_test_docker_compose(vec![(
            "my-service",
            vec![("PORT", "8080"), ("HOST", "0.0.0.0")],
        )]);

        fs::write(&compose_path, compose_content).unwrap();

        let manifest = create_test_manifest(vec![("my-service", ProjectType::Service)]);

        let (_components, docker_compose_env_vars) =
            build_env_var_component_map(temp_dir.path(), &manifest);

        // Simulate existing env vars from code
        let mut scoped_env_vars = vec![crate::core::env_scope::ScopedEnvVar {
            name: "PORT".to_string(),
            scope: crate::core::env_scope::EnvironmentVariableScope::Service,
            scope_id: Some("my-service".to_string()),
            used_by: vec!["my-service".to_string()],
        }];

        let mut existing_vars: std::collections::HashSet<(String, Option<String>)> =
            scoped_env_vars
                .iter()
                .map(|v| (v.name.clone(), v.scope_id.clone()))
                .collect();

        // Add docker-compose env vars (simulating the main function logic)
        for (service_name, env_vars) in docker_compose_env_vars {
            let project_type = manifest
                .projects
                .iter()
                .find(|p| p.name == service_name)
                .map(|p| &p.r#type);

            let (scope, scope_id) = match project_type {
                Some(ProjectType::Service) => (
                    crate::core::env_scope::EnvironmentVariableScope::Service,
                    Some(service_name.clone()),
                ),
                _ => continue,
            };

            for (key, _value) in env_vars {
                // Skip if already exists (this is the deduplication logic)
                if existing_vars.contains(&(key.clone(), scope_id.clone())) {
                    continue;
                }

                scoped_env_vars.push(crate::core::env_scope::ScopedEnvVar {
                    name: key.clone(),
                    scope: scope.clone(),
                    scope_id: scope_id.clone(),
                    used_by: vec![service_name.clone()],
                });

                existing_vars.insert((key, scope_id.clone()));
            }
        }

        // Verify PORT is not duplicated
        let port_count = scoped_env_vars.iter().filter(|v| v.name == "PORT").count();
        assert_eq!(port_count, 1, "PORT should not be duplicated");

        // Verify HOST is added
        assert!(scoped_env_vars.iter().any(|v| v.name == "HOST"));
    }
}
