use std::{fs::read_to_string, io::Write};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, PLATFORM_UI_URL, get_platform_management_api_url},
    core::{
        base_path::{RequiredLocation, find_app_root_path},
        command::command,
        manifest::application::ApplicationManifestData,
        token::get_token,
    },
};

#[derive(Debug, Serialize)]
struct DestroyDeploymentRequest {
    mode: String,
}

#[derive(Debug, Deserialize)]
struct DestroyDeploymentResponse {
    #[allow(dead_code)]
    id: String,
    #[allow(dead_code)]
    status: String,
}

#[derive(Debug)]
pub(crate) struct DestroyCommand;

impl DestroyCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for DestroyCommand {
    fn command(&self) -> Command {
        command("destroy", "Destroy application infrastructure")
            .arg(
                Arg::new("environment")
                    .long("environment")
                    .short('e')
                    .required(true)
                    .help("Environment name (e.g., staging, production)"),
            )
            .arg(
                Arg::new("region")
                    .long("region")
                    .required(true)
                    .help("AWS region (e.g., us-east-1)"),
            )
            .arg(
                Arg::new("mode")
                    .long("mode")
                    .help("Destroy mode: 'all' (default) or 'preserve-data'")
                    .value_parser(["all", "preserve-data"]),
            )
            .arg(
                Arg::new("base_path")
                    .long("path")
                    .short('p')
                    .help("Path to application root (optional)"),
            )
            .arg(
                Arg::new("no-wait")
                    .long("no-wait")
                    .action(clap::ArgAction::SetTrue)
                    .help("Don't wait for destruction to complete"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let environment = matches
            .get_one::<String>("environment")
            .ok_or_else(|| anyhow::anyhow!("Environment is required"))?
            .to_lowercase();

        let region = matches
            .get_one::<String>("region")
            .ok_or_else(|| anyhow::anyhow!("Region is required"))?;

        let mode = matches
            .get_one::<String>("mode")
            .cloned()
            .unwrap_or_else(|| "all".to_string());

        let wait = !matches.get_flag("no-wait");

        let (app_root, _) = find_app_root_path(matches, RequiredLocation::Application)?;
        let manifest_path = app_root.join(".forklaunch").join("manifest.toml");

        let manifest_content = read_to_string(&manifest_path)
            .with_context(|| format!("Failed to read manifest at {:?}", manifest_path))?;

        let manifest: ApplicationManifestData =
            toml::from_str(&manifest_content).with_context(|| "Failed to parse manifest.toml")?;

        let application_id = manifest
            .platform_application_id
            .as_ref()
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Application not integrated with platform.\nRun: forklaunch integrate --app <app-id>"
                )
            })?
            .clone();

        let token = get_token()?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)).set_bold(true))?;
        writeln!(
            stdout,
            "DESTROYING INFRASTRUCTURE: {} ({}) [{}]",
            environment, region, mode
        )?;
        stdout.reset()?;
        writeln!(stdout)?;

        // Confirmation prompt?
        // The implementation plan didn't explicitly ask for one in the logic section, but frontend has it.
        // For CLI, explicit destroy command is usually enough, but let's add a warning if not "preserve-data".
        // Actually, let's trust the user knows what they are doing if they run `destroy`.

        // Removed the old request_body and client setup
        // let request_body = DestroyDeploymentRequest { mode: mode.clone() };
        // let url = format!(
        //     "{}/applications/{}/environments/{}/regions/{}/destroy",
        //     get_platform_management_api_url(),
        //     application_id,
        //     environment,
        //     region
        // );
        // let client = Client::new();

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Triggering destruction...")?;
        stdout.flush()?;
        stdout.reset()?;

        let request_body = DestroyDeploymentRequest { mode: mode.clone() };

        let url = format!(
            "{}/applications/{}/environments/{}/regions/{}/destroy",
            get_platform_management_api_url(),
            application_id,
            environment,
            region
        );

        use crate::core::http_client;

        let response = http_client::post(&url, serde_json::to_value(&request_body)?)
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        let status = response.status();

        if status.is_success() {
            let response_text = response.text().with_context(|| "Failed to read response")?;
            let deployment: DestroyDeploymentResponse = serde_json::from_str(&response_text)
                .with_context(|| format!("Failed to parse destroy response: {}", response_text))?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, " [OK]")?;
            stdout.reset()?;
            writeln!(stdout, "[INFO] Deployment ID: {}", deployment.id)?;

            if wait {
                writeln!(stdout)?;
                crate::deploy::utils::stream_deployment_status(
                    &token,
                    &deployment.id,
                    &mut stdout,
                )?;
            } else {
                writeln!(stdout)?;
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
                writeln!(stdout, "[INFO] Destruction started. Check status at:")?;
                stdout.reset()?;
                writeln!(
                    stdout,
                    "  {}/apps/{}/deployments/{}",
                    PLATFORM_UI_URL, application_id, deployment.id
                )?;
            }
        } else {
            let error_text = response
                .text()
                .unwrap_or_else(|_| "Unknown error".to_string());

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(stdout, " [ERROR]")?;
            stdout.reset()?;

            anyhow::bail!(
                "Failed to destroy infrastructure: {} (Status: {})",
                error_text,
                status
            );
        }

        Ok(())
    }
}
