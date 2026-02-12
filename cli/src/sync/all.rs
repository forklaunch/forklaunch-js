use std::{collections::HashSet, fs, io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use rustyline::{Editor, history::DefaultHistory};
use serde_json::from_str as json_from_str;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::from_str as toml_from_str;

use crate::{
    CliCommand,
    constants::{DIRS_TO_IGNORE, ERROR_FAILED_TO_PARSE_MANIFEST, InitializeType},
    core::{
        base_path::{RequiredLocation, find_app_root_path},
        command::command,
        manifest::application::ApplicationManifestData,
        rendered_template::{RenderedTemplatesCache, write_rendered_templates},
        sync::{
            artifacts::{ArtifactType, remove_project_from_artifacts},
            detection::detect_project_type,
        },
    },
    prompt::{ArrayCompleter, prompt_for_confirmation, prompt_with_validation_with_answers},
};

/// Performs a full sync of all projects in the modules directory with the manifest.
/// This function can be called programmatically from other commands (e.g., release).
///
/// # Arguments
/// * `app_root_path` - Root path of the application
/// * `manifest_data` - Mutable reference to the manifest data to be updated
/// * `rendered_templates_cache` - Cache for rendered templates
/// * `confirm_all` - If true, skips interactive confirmation prompts
/// * `prompts_map` - Pre-provided answers for prompts
/// * `stdout` - Output stream for messages
///
/// # Returns
/// Returns `Ok(true)` if changes were made to the manifest, `Ok(false)` otherwise
pub fn sync_all_projects(
    app_root_path: &Path,
    manifest_data: &mut ApplicationManifestData,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    confirm_all: bool,
    prompts_map: &std::collections::HashMap<String, std::collections::HashMap<String, String>>,
    stdout: &mut StandardStream,
) -> Result<bool> {
    let modules_path = app_root_path.join(&manifest_data.modules_path);
    let mut changes_made = false;

    if !modules_path.exists() {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
        writeln!(
            stdout,
            "Modules path does not exist: {}",
            modules_path.display()
        )?;
        stdout.reset()?;
        return Ok(false);
    }

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(
        stdout,
        "[INFO] Scanning modules directory: {}",
        modules_path.display()
    )?;
    stdout.reset()?;

    let existing_folders: HashSet<String> = fs::read_dir(&modules_path)?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            if entry.path().is_dir() {
                entry.file_name().to_str().map(|s| s.to_string())
            } else {
                None
            }
        })
        .collect();

    let mut orphaned_projects = vec![];
    for project in &manifest_data.projects {
        if !DIRS_TO_IGNORE.contains(&project.name.as_str())
            && !existing_folders.contains(&project.name)
        {
            orphaned_projects.push(project.name.clone());
        }
    }

    if !orphaned_projects.is_empty() {
        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
        writeln!(
            stdout,
            "[WARN] Found {} orphaned project(s) in manifest:",
            orphaned_projects.len()
        )?;
        stdout.reset()?;
        for project_name in &orphaned_projects {
            writeln!(stdout, "  - {}", project_name)?;
        }

        let should_cleanup = if confirm_all {
            true
        } else {
            let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
            prompt_for_confirmation(
                &mut line_editor,
                "Remove these orphaned projects from all artifacts? (y/N) ",
            )?
        };

        if should_cleanup {
            for project_name in &orphaned_projects {
                writeln!(stdout, "[INFO] Removing '{}'...", project_name)?;

                let project = manifest_data
                    .projects
                    .iter()
                    .find(|p| &p.name == project_name);
                let project_type = project
                    .map(|p| p.r#type.clone())
                    .unwrap_or(crate::core::manifest::ProjectType::Library);

                remove_project_from_artifacts(
                    rendered_templates_cache,
                    manifest_data,
                    project_name,
                    project_type,
                    &[
                        ArtifactType::Manifest,
                        ArtifactType::DockerCompose,
                        ArtifactType::Runtime,
                        ArtifactType::ClientSdk,
                    ],
                    app_root_path,
                    &modules_path,
                    stdout,
                )?;
                changes_made = true;
            }

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(
                stdout,
                "[OK] Cleaned up {} orphaned project(s)",
                orphaned_projects.len()
            )?;
            stdout.reset()?;
            writeln!(stdout)?;
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "[INFO] Skipping cleanup of orphaned projects")?;
            stdout.reset()?;
        }
    }

    for entry in fs::read_dir(&modules_path)? {
        let entry = entry?;
        let project_path = entry.path();

        if !project_path.is_dir() {
            continue;
        }

        let Some(project_name) = project_path.file_name() else {
            continue;
        };

        let project_name = project_name.to_string_lossy().to_string();

        if DIRS_TO_IGNORE.contains(&project_name.as_str()) {
            continue;
        }

        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "[INFO] Processing: {}", project_name)?;
        stdout.reset()?;

        let detected_type = detect_project_type(&project_path)?;

        let project_type = if let Some(detected) = detected_type {
            writeln!(stdout, "[INFO] Detected as: {}", detected.to_string())?;
            detected
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "[WARN] Could not auto-detect project type")?;
            stdout.reset()?;

            if confirm_all {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(
                    stdout,
                    "[WARN] Skipping '{}' (cannot auto-detect and no interaction allowed)",
                    project_name
                )?;
                stdout.reset()?;
                continue;
            }

            let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
            let type_str = prompt_with_validation_with_answers(
                &mut line_editor,
                stdout,
                "category",
                &ArgMatches::default(),
                &format!("Project type for '{}'", project_name),
                Some(&InitializeType::VARIANTS),
                |input| InitializeType::VARIANTS.contains(&input),
                |_| "Invalid project type. Please try again.".to_string(),
                &project_name,
                prompts_map,
            )?;
            type_str.parse()?
        };

        let should_sync = if confirm_all {
            true
        } else {
            let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
            prompt_for_confirmation(
                &mut line_editor,
                &format!(
                    "Sync '{}' as {}? (y/N) ",
                    project_name,
                    project_type.to_string()
                ),
            )?
        };

        if !should_sync {
            writeln!(stdout, "[INFO] Skipped")?;
            continue;
        }

        // Take a snapshot of the project state before syncing to detect changes
        let project_snapshot_before = manifest_data
            .projects
            .iter()
            .find(|p| p.name == project_name)
            .map(|p| toml::to_string(p).unwrap_or_default());

        match project_type {
            InitializeType::Service => {
                writeln!(stdout, "[INFO] Syncing service...")?;

                match crate::sync::service::sync_service_with_cache(
                    &project_name,
                    app_root_path,
                    manifest_data,
                    &ArgMatches::default(),
                    prompts_map,
                    rendered_templates_cache,
                    stdout,
                ) {
                    Ok(_) => {
                        // Compare snapshot to detect changes
                        let project_snapshot_after = manifest_data
                            .projects
                            .iter()
                            .find(|p| p.name == project_name)
                            .map(|p| toml::to_string(p).unwrap_or_default());

                        if project_snapshot_before != project_snapshot_after {
                            changes_made = true;
                        }
                    }
                    Err(e) => {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                        writeln!(stdout, "[ERROR] {}", e)?;
                        stdout.reset()?;
                    }
                }
            }
            InitializeType::Worker => {
                writeln!(stdout, "[INFO] Syncing worker...")?;

                match crate::sync::worker::sync_worker_with_cache(
                    &project_name,
                    app_root_path,
                    manifest_data,
                    &ArgMatches::default(),
                    prompts_map,
                    rendered_templates_cache,
                    stdout,
                ) {
                    Ok(_) => {
                        // Compare snapshot to detect changes
                        let project_snapshot_after = manifest_data
                            .projects
                            .iter()
                            .find(|p| p.name == project_name)
                            .map(|p| toml::to_string(p).unwrap_or_default());

                        if project_snapshot_before != project_snapshot_after {
                            changes_made = true;
                        }
                    }
                    Err(e) => {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                        writeln!(stdout, "[ERROR] {}", e)?;
                        stdout.reset()?;
                    }
                }
            }
            InitializeType::Library => {
                writeln!(stdout, "[INFO] Syncing library...")?;

                match crate::sync::library::sync_library_with_cache(
                    &project_name,
                    app_root_path,
                    manifest_data,
                    &ArgMatches::default(),
                    prompts_map,
                    rendered_templates_cache,
                    stdout,
                ) {
                    Ok(_) => {
                        // Compare snapshot to detect changes
                        let project_snapshot_after = manifest_data
                            .projects
                            .iter()
                            .find(|p| p.name == project_name)
                            .map(|p| toml::to_string(p).unwrap_or_default());

                        if project_snapshot_before != project_snapshot_after {
                            changes_made = true;
                        }
                    }
                    Err(e) => {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                        writeln!(stdout, "[ERROR] {}", e)?;
                        stdout.reset()?;
                    }
                }
            }
            InitializeType::Router | InitializeType::Module => {
                writeln!(
                    stdout,
                    "[INFO] Skipped (routers and modules are synced as part of their parent service)"
                )?;
            }
        }
    }

    Ok(changes_made)
}

#[derive(Debug)]
pub(crate) struct SyncAllCommand;

impl SyncAllCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for SyncAllCommand {
    fn command(&self) -> Command {
        command(
            "all",
            "Sync all projects in the modules directory to application artifacts",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path"),
        )
        .arg(
            Arg::new("confirm")
                .short('c')
                .long("confirm")
                .action(ArgAction::SetTrue)
                .help("Skip confirmation prompts"),
        )
        .arg(
            Arg::new("prompts")
                .short('P')
                .long("prompts")
                .help("JSON object with pre-provided answers for prompts")
                .value_name("JSON"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let prompts_map: std::collections::HashMap<
            String,
            std::collections::HashMap<String, String>,
        > = if let Some(prompts_json) = matches.get_one::<String>("prompts") {
            json_from_str(prompts_json).with_context(|| "Failed to parse prompts JSON")?
        } else {
            std::collections::HashMap::new()
        };

        let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");

        let mut rendered_templates_cache = RenderedTemplatesCache::new();
        rendered_templates_cache.get(&manifest_path)?;

        let manifest_template = rendered_templates_cache.get(&manifest_path)?.unwrap();
        let mut manifest_data =
            toml_from_str::<ApplicationManifestData>(&manifest_template.content)
                .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;

        let confirm_all = matches.get_flag("confirm");

        // Call the reusable sync function
        let _changes_made = sync_all_projects(
            &app_root_path,
            &mut manifest_data,
            &mut rendered_templates_cache,
            confirm_all,
            &prompts_map,
            &mut stdout,
        )?;

        // Generate .env.template files and sync .env.local
        let modules_path = app_root_path.join(&manifest_data.modules_path);
        crate::core::env_template::generate_env_templates(
            &modules_path,
            &manifest_data,
            &mut rendered_templates_cache,
            &mut stdout,
        )?;
        crate::core::env_template::sync_env_local_files(
            &modules_path,
            &manifest_data,
            &mut stdout,
        )?;

        // Write the updated manifest back to cache
        rendered_templates_cache.insert(
            manifest_path.to_string_lossy().to_string(),
            crate::core::rendered_template::RenderedTemplate {
                path: manifest_path.clone(),
                content: toml::to_string_pretty(&manifest_data)
                    .context("Failed to serialize manifest")?,
                context: Some("Failed to write manifest".to_string()),
            },
        );

        // Collect and write all rendered templates (including manifest)
        let rendered_templates: Vec<_> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        write_rendered_templates(&rendered_templates, false, &mut stdout)?;

        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        writeln!(stdout, "[OK] Sync all completed")?;
        stdout.reset()?;

        Ok(())
    }
}
