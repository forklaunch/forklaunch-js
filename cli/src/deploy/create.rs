use std::{fs::read_to_string, io::Write, thread::sleep, time::Duration};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, PLATFORM_UI_URL, get_api_url},
    core::{
        base_path::{RequiredLocation, find_app_root_path},
        command::command,
        manifest::application::ApplicationManifestData,
        token::get_token,
    },
};

#[derive(Debug, Serialize)]
struct CreateDeploymentRequest {
    #[serde(rename = "applicationId")]
    application_id: String,
    #[serde(rename = "releaseVersion")]
    release_version: String,
    environment: String,
    region: String,
}

#[derive(Debug, Deserialize)]
struct CreateDeploymentResponse {
    id: String,
    #[allow(dead_code)]
    status: String,
}

#[derive(Debug, Deserialize)]
struct DeploymentStatus {
    #[allow(dead_code)]
    id: String,
    status: String,
    phase: Option<String>,
    #[serde(rename = "completedAt")]
    #[allow(dead_code)]
    completed_at: Option<String>,
    endpoints: Option<DeploymentEndpoints>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeploymentEndpoints {
    api: Option<String>,
    docs: Option<String>,
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
        command("create", "Create a new deployment")
            .arg(
                Arg::new("release")
                    .long("release")
                    .short('r')
                    .required(true)
                    .help("Release version to deploy"),
            )
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
                Arg::new("base_path")
                    .long("path")
                    .short('p')
                    .help("Path to application root (optional)"),
            )
            .arg(
                Arg::new("no-wait")
                    .long("no-wait")
                    .action(clap::ArgAction::SetTrue)
                    .help("Don't wait for deployment to complete"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let release_version = matches
            .get_one::<String>("release")
            .ok_or_else(|| anyhow::anyhow!("Release version is required"))?;

        let environment = matches
            .get_one::<String>("environment")
            .ok_or_else(|| anyhow::anyhow!("Environment is required"))?
            .to_lowercase();

        let region = matches
            .get_one::<String>("region")
            .ok_or_else(|| anyhow::anyhow!("Region is required"))?;

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

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
        writeln!(
            stdout,
            "Creating deployment: {} → {} ({})",
            release_version, environment, region
        )?;
        stdout.reset()?;
        writeln!(stdout)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        write!(stdout, "[INFO] Triggering deployment...")?;
        stdout.flush()?;
        stdout.reset()?;

        let request_body = CreateDeploymentRequest {
            application_id: application_id.clone(),
            release_version: release_version.clone(),
            environment,
            region: region.clone(),
        };

        let url = format!("{}/deployments", get_api_url());
        let client = Client::new();

        eprintln!("[DEBUG] POST {} with body: {:?}", url, request_body);

        let response = client
            .post(&url)
            .bearer_auth(&token)
            .json(&request_body)
            .send()
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        eprintln!("[DEBUG] Response status: {}", response.status());

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .unwrap_or_else(|_| "Unknown error".to_string());
            eprintln!("[DEBUG] Error response: {}", error_text);
            bail!(
                "Failed to create deployment: {} (Status: {})",
                error_text,
                status
            );
        }

        let response_text = response.text().with_context(|| "Failed to read response")?;
        eprintln!("[DEBUG] Raw response body: {}", response_text);

        let deployment: CreateDeploymentResponse = serde_json::from_str(&response_text)
            .with_context(|| format!("Failed to parse deployment response: {}", response_text))?;

        eprintln!("[DEBUG] Parsed deployment: {:?}", deployment);

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, " [OK]")?;
        stdout.reset()?;
        writeln!(stdout, "[INFO] Deployment ID: {}", deployment.id)?;

        if wait {
            writeln!(stdout)?;
            stream_deployment_status(&token, &deployment.id, &mut stdout)?;
        } else {
            writeln!(stdout)?;
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "[INFO] Deployment started. Check status at:")?;
            stdout.reset()?;
            writeln!(
                stdout,
                "  {}/apps/{}/deployments/{}",
                PLATFORM_UI_URL, application_id, deployment.id
            )?;
        }

        Ok(())
    }
}

fn stream_deployment_status(
    token: &str,
    deployment_id: &str,
    stdout: &mut StandardStream,
) -> Result<()> {
    let client = Client::new();
    let url = format!("{}/deployments/{}", get_api_url(), deployment_id);

    let mut last_phase: Option<String> = None;

    loop {
        eprintln!("[DEBUG] Polling deployment status: GET {}", url);

        let response = client
            .get(&url)
            .bearer_auth(token)
            .send()
            .with_context(|| "Failed to fetch deployment status")?;

        eprintln!("[DEBUG] Status poll response: {}", response.status());

        if !response.status().is_success() {
            bail!("Failed to get deployment status: {}", response.status());
        }

        let response_text = response
            .text()
            .with_context(|| "Failed to read status response")?;
        eprintln!("[DEBUG] Status response body: {}", response_text);

        let status: DeploymentStatus = serde_json::from_str(&response_text)
            .with_context(|| format!("Failed to parse deployment status: {}", response_text))?;

        eprintln!(
            "[DEBUG] Parsed status - status: {}, phase: {:?}",
            status.status, status.phase
        );

        if let Some(phase) = &status.phase {
            if last_phase.as_ref() != Some(phase) {
                display_phase_update(phase, stdout)?;
                last_phase = Some(phase.clone());
            }
        }

        match status.status.as_str() {
            "completed" => {
                eprintln!("[DEBUG] Deployment completed successfully");
                eprintln!("[DEBUG] Endpoints: {:?}", status.endpoints);

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
                writeln!(stdout, "\n[OK] Deployment successful!")?;
                stdout.reset()?;

                if let Some(endpoints) = status.endpoints {
                    writeln!(stdout)?;
                    if let Some(api) = endpoints.api {
                        writeln!(stdout, "[INFO] API: {}", api)?;
                    }
                    if let Some(docs) = endpoints.docs {
                        writeln!(stdout, "[INFO] Docs: {}", docs)?;
                    }
                }

                break;
            }
            "failed" => {
                eprintln!("[DEBUG] Deployment failed with error: {:?}", status.error);

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)).set_bold(true))?;
                writeln!(stdout, "\n[ERROR] Deployment failed")?;
                stdout.reset()?;

                if let Some(error) = status.error {
                    writeln!(stdout, "[ERROR] Error: {}", error)?;
                }

                bail!("Deployment failed");
            }
            _ => {
                eprintln!("[DEBUG] Deployment still in progress, waiting 3s...");
                // Still in progress, wait and poll again
                sleep(Duration::from_secs(3));
            }
        }
    }

    Ok(())
}

fn display_phase_update(phase: &str, stdout: &mut StandardStream) -> Result<()> {
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    let message = match phase {
        "validating" => "  Validating configuration...",
        "provisioning_database" => "  Provisioning database (RDS PostgreSQL db.t3.micro)...",
        "provisioning_cache" => "  Provisioning cache (ElastiCache Redis)...",
        "creating_network" => "  Creating network infrastructure...",
        "creating_load_balancer" => "  Creating load balancer...",
        "deploying_services" => "  Deploying services (256m CPU, 512Mi RAM)...",
        "configuring_autoscaling" => "  Configuring auto-scaling (1-2 replicas)...",
        "configuring_monitoring" => "  Setting up monitoring (OTEL, Prometheus, Grafana)...",
        _ => phase,
    };
    writeln!(stdout, "{}", message)?;
    stdout.reset()?;
    Ok(())
}
