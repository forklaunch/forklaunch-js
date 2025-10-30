use std::{collections::HashMap, io::Write};

use anyhow::{Context, Result, bail};
use clap::ArgMatches;
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    constants::ERROR_FAILED_TO_PARSE_MANIFEST,
    core::{
        base_path::{RequiredLocation, find_app_root_path},
        manifest::{ProjectType, application::ApplicationManifestData},
        rendered_template::{RenderedTemplatesCache, write_rendered_templates},
        sync::{
            artifacts::{ArtifactType, ProjectSyncMetadata, sync_project_to_artifacts},
            detection::detect_service_config,
            resolvers::{
                display_detection_results, resolve_database_config, resolve_description,
                resolve_infrastructure_config,
            },
        },
    },
    prompt::{ArrayCompleter, prompt_for_confirmation},
};

#[derive(Debug)]
pub(crate) struct ServiceSyncCommand;

impl ServiceSyncCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

pub(crate) fn sync_service_with_cache(
    service_name: &str,
    app_root_path: &std::path::Path,
    manifest_data: &ApplicationManifestData,
    matches: &ArgMatches,
    prompts_map: &HashMap<String, HashMap<String, String>>,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    stdout: &mut StandardStream,
) -> Result<()> {
    let modules_path = app_root_path.join(&manifest_data.modules_path);
    let service_path = modules_path.join(service_name);

    if !service_path.exists() {
        use crate::core::sync::artifacts::remove_project_from_artifacts;

        if let Some(project) = manifest_data
            .projects
            .iter()
            .find(|p| p.name == service_name)
        {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(
                stdout,
                "[WARN] Service directory not found, but exists in manifest"
            )?;
            stdout.reset()?;

            let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
            let should_cleanup = prompt_for_confirmation(
                &mut line_editor,
                &format!(
                    "Remove service '{}' from all artifacts? (y/N) ",
                    service_name
                ),
            )?;

            if !should_cleanup {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, "[INFO] Skipping cleanup")?;
                stdout.reset()?;
                bail!("Service directory not found: {}", service_path.display());
            }

            writeln!(
                stdout,
                "[INFO] Removing '{}' from artifacts...",
                service_name
            )?;

            remove_project_from_artifacts(
                rendered_templates_cache,
                manifest_data,
                service_name,
                project.r#type.clone(),
                &[
                    ArtifactType::Manifest,
                    ArtifactType::DockerCompose,
                    ArtifactType::Runtime,
                    ArtifactType::UniversalSdk,
                ],
                app_root_path,
                &modules_path,
                stdout,
            )?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "[OK] Removed orphaned service '{}'", service_name)?;
            stdout.reset()?;
            return Ok(());
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(
                stdout,
                "[ERROR] Service directory not found: {}",
                service_path.display()
            )?;
            stdout.reset()?;
            bail!("Service directory not found: {}", service_path.display());
        }
    }

    if manifest_data
        .projects
        .iter()
        .any(|p| p.name == service_name)
    {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "Service '{}' already synced", service_name)?;
        stdout.reset()?;
        return Ok(());
    }

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "[INFO] Detecting configuration from files...")?;
    stdout.reset()?;

    let detected = detect_service_config(&service_path)?;
    display_detection_results(&detected, stdout)?;

    let database = resolve_database_config(
        service_name,
        &service_path,
        &detected,
        matches,
        prompts_map,
        stdout,
    )?;

    let infrastructure =
        resolve_infrastructure_config(service_name, &detected, matches, prompts_map, stdout)?;

    let description =
        resolve_description(service_name, &service_path, matches, prompts_map, stdout)?;

    let sync_metadata = ProjectSyncMetadata {
        project_type: ProjectType::Service,
        project_name: service_name.to_string(),
        description,
        database: Some(database),
        infrastructure,
        worker_type: None,
    };

    sync_project_to_artifacts(
        rendered_templates_cache,
        &sync_metadata,
        &[
            ArtifactType::Manifest,
            ArtifactType::DockerCompose,
            ArtifactType::Runtime,
            ArtifactType::UniversalSdk,
            ArtifactType::ModulesTsconfig,
        ],
        &app_root_path,
        &modules_path,
        stdout,
    )?;

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
    writeln!(
        stdout,
        "[OK] Service '{}' synced successfully",
        service_name
    )?;
    stdout.reset()?;

    Ok(())
}

impl crate::CliCommand for ServiceSyncCommand {
    fn command(&self) -> clap::Command {
        use clap::Arg;
        crate::core::command::command(
            "service",
            "Sync a specific service to application artifacts",
        )
        .arg(
            Arg::new("name")
                .help("The name of the service")
                .required(true),
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path"),
        )
        .arg(
            Arg::new("prompts")
                .short('P')
                .long("prompts")
                .help("JSON object with pre-provided answers")
                .value_name("JSON"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let service_name = matches.get_one::<String>("name").unwrap();

        let prompts_map: HashMap<String, HashMap<String, String>> =
            if let Some(prompts_json) = matches.get_one::<String>("prompts") {
                serde_json::from_str(prompts_json).context("Failed to parse prompts JSON")?
            } else {
                HashMap::new()
            };

        let (app_root_path, _) = find_app_root_path(matches, RequiredLocation::Application)?;

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let mut rendered_templates_cache = RenderedTemplatesCache::new();
        let manifest_path = app_root_path.join(".forklaunch").join("manifest.toml");
        rendered_templates_cache.get(&manifest_path)?;

        let manifest_template = rendered_templates_cache.get(&manifest_path)?.unwrap();
        let manifest_data: ApplicationManifestData =
            toml::from_str(&manifest_template.content).context(ERROR_FAILED_TO_PARSE_MANIFEST)?;

        sync_service_with_cache(
            service_name,
            &app_root_path,
            &manifest_data,
            matches,
            &prompts_map,
            &mut rendered_templates_cache,
            &mut stdout,
        )?;

        let rendered_templates: Vec<_> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        write_rendered_templates(&rendered_templates, false, &mut stdout)?;

        Ok(())
    }
}
