use std::{fs::read_to_string, io::Write};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use dialoguer::{Input, theme::ColorfulTheme};
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
    #[serde(rename = "distributionConfig")]
    distribution_config: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateDeploymentResponse {
    id: String,
    #[allow(dead_code)]
    status: String,
}

/// ... (DeploymentBlockedError struct)

// Error handling structs
#[derive(Debug, Deserialize)]
struct DeploymentBlockedError {
    message: String,
    details: Vec<DeploymentErrorDetail>,
}

#[derive(Debug, Deserialize)]
struct DeploymentErrorDetail {
    #[serde(rename = "type")]
    component_type: String, // "service" or "worker"
    id: String,
    name: String,
    #[serde(rename = "missingKeys")]
    missing_keys: Vec<String>,
}

#[derive(Debug, Serialize)]
struct UpdateEnvironmentVariablesRequest {
    region: String,
    variables: Vec<EnvironmentVariableUpdate>,
}

#[derive(Debug, Serialize, Clone)]
struct EnvironmentVariableUpdate {
    key: String,
    value: String,
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
                Arg::new("distribution_config")
                    .long("distribution-config")
                    .help("Distribution strategy (centralized or distributed)"),
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
            "Creating deployment: {} -> {} ({})",
            release_version, environment, region
        )?;
        stdout.reset()?;
        writeln!(stdout)?;

        let request_body = CreateDeploymentRequest {
            application_id: application_id.clone(),
            release_version: release_version.clone(),
            environment: environment.clone(),
            region: region.clone(),
            distribution_config: Some(
                matches
                    .get_one::<String>("distribution_config")
                    .cloned()
                    .unwrap_or_else(|| "centralized".to_string()),
            ),
        };

        let url = format!("{}/deployments", get_api_url());
        let client = Client::new();

        let mut retry_count = 0;
        const MAX_RETRIES: u32 = 3;

        loop {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            write!(stdout, "[INFO] Triggering deployment...")?;
            stdout.flush()?;
            stdout.reset()?;

            eprintln!("[DEBUG] POST {} with body: {:?}", url, request_body);

            let response = client
                .post(&url)
                .bearer_auth(&token)
                .json(&request_body)
                .send()
                .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

            let status = response.status();
            eprintln!("[DEBUG] Response status: {}", status);

            if status.is_success() {
                // Success case
                let response_text = response.text().with_context(|| "Failed to read response")?;
                let deployment: CreateDeploymentResponse = serde_json::from_str(&response_text)
                    .with_context(|| {
                        format!("Failed to parse deployment response: {}", response_text)
                    })?;

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
                    writeln!(stdout, "[INFO] Deployment started. Check status at:")?;
                    stdout.reset()?;
                    writeln!(
                        stdout,
                        "  {}/apps/{}/deployments/{}",
                        PLATFORM_UI_URL, application_id, deployment.id
                    )?;
                }
                break;
            } else if status.as_u16() == 400 {
                // Handle 400 Bad Request - check for missing env vars
                let error_text = response.text().unwrap_or_default();
                eprintln!("[DEBUG] Error body: {}", error_text);

                // Try to parse as DeploymentBlockedError
                if let Ok(blocked_error) =
                    serde_json::from_str::<DeploymentBlockedError>(&error_text)
                {
                    // Check retry limit to prevent infinite loops
                    retry_count += 1;
                    if retry_count > MAX_RETRIES {
                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                        writeln!(stdout, " [ERROR]")?;
                        stdout.reset()?;
                        bail!(
                            "Deployment failed after {} retries. Please check your environment variable configuration and try again.",
                            MAX_RETRIES
                        );
                    }

                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                    writeln!(stdout, " [WARNING]")?;
                    stdout.reset()?;

                    writeln!(stdout)?;
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                    writeln!(
                        stdout,
                        "[WARNING] Deployment blocked: {}",
                        blocked_error.message
                    )?;
                    stdout.reset()?;
                    writeln!(
                        stdout,
                        "[INFO] You must provide values for the missing environment variables.\n"
                    )?;

                    // Collect all missing keys first to check if we've already prompted
                    let mut all_missing_keys: Vec<String> = Vec::new();
                    for detail in &blocked_error.details {
                        all_missing_keys.extend(detail.missing_keys.clone());
                    }

                    // If no missing keys, something else is wrong - don't loop
                    if all_missing_keys.is_empty() {
                        bail!(
                            "Deployment blocked but no missing keys reported. Error: {}",
                            blocked_error.message
                        );
                    }

                    // Iterate through details and prompt for missing keys
                    let mut all_updates = Vec::new();
                    for detail in blocked_error.details {
                        if detail.missing_keys.is_empty() {
                            continue;
                        }

                        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
                        writeln!(
                            stdout,
                            "[INFO] Missing variables for {} '{}':",
                            detail.component_type, detail.name
                        )?;
                        stdout.reset()?;

                        let mut updates = Vec::new();
                        for key in detail.missing_keys {
                            let value: String = Input::with_theme(&ColorfulTheme::default())
                                .with_prompt(format!("  Enter value for {}", key))
                                .interact_text()?;

                            updates.push(EnvironmentVariableUpdate {
                                key: key.clone(),
                                value,
                            });
                        }

                        if !updates.is_empty() {
                            // Save the variables
                            let update_url = if detail.component_type == "worker" {
                                format!(
                                    "{}/workers/{}/environments/{}/variables",
                                    get_api_url(),
                                    detail.id,
                                    environment
                                )
                            } else {
                                format!(
                                    "{}/services/{}/environments/{}/variables",
                                    get_api_url(),
                                    detail.id,
                                    environment
                                )
                            };

                            let update_body = UpdateEnvironmentVariablesRequest {
                                region: region.clone(),
                                variables: updates.clone(),
                            };

                            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
                            write!(stdout, "[INFO] Saving variables...")?;
                            stdout.flush()?;
                            stdout.reset()?;

                            let update_response = client
                                .put(&update_url)
                                .bearer_auth(&token)
                                .json(&update_body)
                                .send()
                                .with_context(|| "Failed to save environment variables")?;

                            if !update_response.status().is_success() {
                                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                                writeln!(stdout, " [ERROR]")?;
                                stdout.reset()?;
                                let err_text = update_response.text().unwrap_or_default();
                                bail!("Failed to save variables: {}", err_text);
                            }

                            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                            writeln!(stdout, " [OK]")?;
                            stdout.reset()?;

                            all_updates.extend(updates);
                        }
                    }

                    if all_updates.is_empty() {
                        // No variables were actually saved, something went wrong
                        bail!("No environment variables were saved. Deployment cannot proceed.");
                    }

                    writeln!(stdout)?;
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
                    writeln!(stdout, "[INFO] Retrying deployment...")?;
                    stdout.reset()?;
                    writeln!(stdout)?;
                    continue; // Loop back to retry deployment
                } else {
                    // Could not parse as detailed error, just fail
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                    writeln!(stdout, " [ERROR]")?;
                    stdout.reset()?;
                    bail!("Deployment failed: {}", error_text);
                }
            } else {
                // Other error code
                let error_text = response
                    .text()
                    .unwrap_or_else(|_| "Unknown error".to_string());

                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                writeln!(stdout, " [ERROR]")?;
                stdout.reset()?;

                bail!(
                    "Failed to create deployment: {} (Status: {})",
                    error_text,
                    status
                );
            }
        }

        Ok(())
    }
}
