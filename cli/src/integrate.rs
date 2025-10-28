use std::{fs::write, io::Write};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};
use toml::to_string_pretty;

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_api_url},
    core::{
        base_path::{RequiredLocation, find_app_root_path},
        command::command,
        manifest::application::ApplicationManifestData,
        token::get_token,
    },
};

#[derive(Debug, Serialize, Deserialize)]
struct ApplicationResponse {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "organizationId")]
    organization_id: String,
}

#[derive(Debug)]
pub(crate) struct IntegrateCommand;

impl IntegrateCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for IntegrateCommand {
    fn command(&self) -> Command {
        command(
            "integrate",
            "Integrate local application with ForkLaunch platform",
        )
        .arg(
            Arg::new("app")
                .long("app")
                .short('a')
                .required(true)
                .help("Platform application ID to link to"),
        )
        .arg(
            Arg::new("base_path")
                .long("path")
                .short('p')
                .help("Path to application root (optional)"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        // Get application ID from args
        let application_id = matches
            .get_one::<String>("app")
            .ok_or_else(|| anyhow::anyhow!("Application ID is required"))?;

        // Get token
        let token = get_token()?;

        // Find application root
        let (app_root, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root.join(".forklaunch").join("manifest.toml");

        // Validate application exists on platform
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "[INFO] Validating application on platform...")?;
        stdout.reset()?;

        let url = format!("{}/applications/{}", get_api_url(), application_id);
        let client = Client::new();
        let response = client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if !response.status().is_success() {
            bail!(
                "Failed to find application: {} (Status: {})",
                application_id,
                response.status()
            );
        }

        let app_data: ApplicationResponse = response
            .json()
            .with_context(|| "Failed to parse application response")?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "[OK] Found application: {}", app_data.name)?;
        stdout.reset()?;

        // Read current manifest
        let manifest_content = std::fs::read_to_string(&manifest_path)
            .with_context(|| format!("Failed to read manifest at {:?}", manifest_path))?;

        let mut manifest: ApplicationManifestData =
            toml::from_str(&manifest_content).with_context(|| "Failed to parse manifest.toml")?;

        // Update manifest with platform integration
        manifest.platform_application_id = Some(application_id.clone());
        manifest.platform_organization_id = Some(app_data.organization_id.clone());

        // Write updated manifest
        let updated_manifest =
            to_string_pretty(&manifest).with_context(|| "Failed to serialize updated manifest")?;

        write(&manifest_path, updated_manifest)
            .with_context(|| format!("Failed to write manifest at {:?}", manifest_path))?;

        // Success output
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        writeln!(stdout, "\n[OK] Application integrated successfully!")?;
        stdout.reset()?;

        writeln!(stdout, "[INFO] Platform App ID: {}", application_id)?;
        writeln!(stdout, "[INFO] Application Name: {}", app_data.name)?;
        writeln!(
            stdout,
            "[INFO] Organization ID: {}",
            app_data.organization_id
        )?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "\n[INFO] You can now use:")?;
        stdout.reset()?;
        writeln!(stdout, "  forklaunch release create --version <version>")?;
        writeln!(
            stdout,
            "  forklaunch deploy create --release <version> --environment <env> --region <region>"
        )?;

        Ok(())
    }
}
