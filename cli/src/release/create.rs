use std::{
    collections::HashMap,
    fs::{self, create_dir_all, read_to_string},
    io::Write,
};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use reqwest::blocking::Client;
use serde::Serialize;
use serde_json::Value;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::to_string_pretty;

use super::{
    git::{get_git_branch, get_git_commit, is_git_repo},
    manifest_generator::{
        EnvironmentVariableRequirement, EnvironmentVariableScope, ReleaseManifest,
        generate_release_manifest,
    },
};
use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_api_url},
    core::{
        ast::infrastructure::{
            env::find_all_env_vars,
            runtime_deps::{find_all_runtime_deps, get_unique_resource_types},
        },
        base_path::{RequiredLocation, find_app_root_path},
        command::command,
        env::{find_workspace_root, get_modules_path},
        env_scope::determine_env_var_scopes,
        manifest::{ProjectType, application::ApplicationManifestData},
        openapi_export::export_all_services,
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
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        // Get version
        let version = matches
            .get_one::<String>("release_version")
            .ok_or_else(|| anyhow::anyhow!("Version is required"))?;

        let dry_run = matches.get_flag("dry-run");

        // Find application root
        let (app_root, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root.join(".forklaunch").join("manifest.toml");

        // Read manifest
        let manifest_content = read_to_string(&manifest_path)
            .with_context(|| format!("Failed to read manifest at {:?}", manifest_path))?;

        let mut manifest: ApplicationManifestData =
            toml::from_str(&manifest_content).with_context(|| "Failed to parse manifest.toml")?;

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

        if manifest.git_repository.is_none() {
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

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
        writeln!(stdout, "[INFO] Creating release {}...", version)?;
        stdout.reset()?;
        writeln!(stdout)?;

        // Step 1: Detect git metadata
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "  Detecting git metadata...")?;
        stdout.flush()?;
        stdout.reset()?;

        if !is_git_repo() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, " [WARN] Not a git repository")?;
            stdout.reset()?;
            bail!("Current directory is not a git repository. Initialize git first.");
        }

        let git_commit = get_git_commit()?;
        let git_branch = get_git_branch().ok();

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK]")?;
        stdout.reset()?;
        writeln!(
            stdout,
            "[INFO] Commit: {} ({})",
            &git_commit[..8],
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
            if project.r#type == ProjectType::Service {
                let openapi_file = openapi_path.join(&project.name).join("openapi.json");
                if openapi_file.exists() {
                    let content = read_to_string(&openapi_file)?;
                    let spec: Value = serde_json::from_str(&content)?;
                    openapi_specs.insert(project.name.clone(), spec);
                }
            }
        }

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting required environment variables...")?;
        stdout.flush()?;
        stdout.reset()?;

        let workspace_root = find_workspace_root(&app_root)?;
        let modules_path = get_modules_path(&workspace_root)?;
        let project_env_vars = find_all_env_vars(&modules_path)?;

        let scoped_env_vars = determine_env_var_scopes(&project_env_vars, &manifest)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK] ({} variables)", scoped_env_vars.len())?;
        stdout.reset()?;

        // Detect runtime dependencies
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Detecting runtime dependencies...")?;
        stdout.flush()?;
        stdout.reset()?;

        let all_runtime_deps = find_all_runtime_deps(&modules_path)?;

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
                description: Some(format!("Used by: {}", v.used_by.join(", "))),
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

        let release_manifest = generate_release_manifest(
            application_id.clone(),
            version.clone(),
            git_commit.clone(),
            git_branch.clone(),
            &manifest,
            &openapi_specs,
            required_env_vars,
            &project_runtime_deps,
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
    let token = get_token()?;

    let request_body = CreateReleaseRequest {
        application_id: application_id.to_string(),
        manifest,
        released_by: None, // TODO: Get from token
    };

    let url = format!("{}/releases", get_api_url());
    let client = Client::new();

    let response = client
        .post(&url)
        .bearer_auth(&token)
        .json(&request_body)
        .send()
        .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .unwrap_or_else(|_| "Unknown error".to_string());
        bail!(
            "Failed to create release: {} (Status: {})",
            error_text,
            status
        );
    }

    Ok(())
}
