use std::io::Write;

use anyhow::{Context, Result, bail};
use base64::{Engine as _, engine::general_purpose};
use clap::{Arg, ArgMatches, Command};
use dialoguer::{Input, theme::ColorfulTheme};
use serde::{Deserialize, Serialize};
use serde_json;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_platform_management_api_url, get_platform_ui_url},
    core::command::command,
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
    missing_keys: Vec<MissingKey>,
}

#[derive(Debug, Deserialize)]
struct MissingKey {
    #[serde(rename = "key")]
    name: String,
    component: Option<ComponentMetadata>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct ComponentMetadata {
    #[serde(rename = "type")]
    component_type: String,
    property: String,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    component: Option<ComponentMetadata>,
}

/// Validate environment variable input based on component metadata
fn validate_env_var_input(
    key_name: &str,
    value: &str,
    component: &Option<ComponentMetadata>,
) -> Result<(), String> {
    if value.is_empty() {
        return Err("Value cannot be empty".to_string());
    }

    // Check for numeric values based on variable name suffixes
    let key_upper = key_name.to_uppercase();
    if key_upper.ends_with("_PORT") {
        if value.parse::<u16>().is_err() {
            return Err(format!(
                "Expected a valid port number (0-65535) for '{}'",
                key_name
            ));
        }
    } else if key_upper.ends_with("_SECONDS")
        || key_upper.ends_with("_TIMEOUT")
        || key_upper.ends_with("_DURATION")
    {
        if value.parse::<u32>().is_err() {
            return Err(format!("Expected a numeric value for '{}'", key_name));
        }
    }

    if let Some(meta) = component {
        match meta.property.as_str() {
            // Numeric properties
            "port" | "timeout" => {
                if value.parse::<u16>().is_err() {
                    return Err(format!(
                        "Expected a valid port number (0-65535) for property '{}'",
                        meta.property
                    ));
                }
            }
            // Base64 validation for cryptographic keys
            "base64-bytes-32" => match general_purpose::STANDARD.decode(value) {
                Ok(bytes) if bytes.len() == 32 => {}
                Ok(_) => return Err("Expected a base64-encoded 32-byte value".to_string()),
                Err(_) => return Err("Expected a valid base64 string".to_string()),
            },
            "base64-bytes-64" => match general_purpose::STANDARD.decode(value) {
                Ok(bytes) if bytes.len() == 64 => {}
                Ok(_) => return Err("Expected a base64-encoded 64-byte value".to_string()),
                Err(_) => return Err("Expected a valid base64 string".to_string()),
            },
            // For other properties, accept any non-empty string
            _ => {}
        }
    }

    Ok(())
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

        // Upfront validation
        let _token = crate::core::validate::require_auth()?;
        let (_app_root, manifest) = crate::core::validate::require_manifest(matches)?;
        let application_id = crate::core::validate::require_integration(&manifest)?;

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

        let url = format!("{}/deployments", get_platform_management_api_url());

        use crate::core::http_client;

        let mut retry_count = 0;
        const MAX_RETRIES: u32 = 3;

        loop {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            write!(stdout, "[INFO] Triggering deployment...")?;
            stdout.flush()?;
            stdout.reset()?;

            let response = http_client::post(&url, serde_json::to_value(&request_body)?)
                .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

            let status = response.status();

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
                        "", // Token not needed - http_client handles auth
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
                        get_platform_ui_url(), application_id, deployment.id
                    )?;
                }
                break;
            } else if status.as_u16() == 400 {
                // Handle 400 Bad Request - check for missing env vars
                let error_text = response.text().unwrap_or_default();

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
                        all_missing_keys
                            .extend(detail.missing_keys.iter().map(|mk| mk.name.clone()));
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
                        for missing_key in detail.missing_keys {
                            // Special handling for NODE_ENV
                            if missing_key.name == "NODE_ENV" {
                                let selection =
                                    dialoguer::Select::with_theme(&ColorfulTheme::default())
                                        .with_prompt("Is this a production deployment?")
                                        .item("Yes (set NODE_ENV=production)")
                                        .item("No (set NODE_ENV=development)")
                                        .item("Skip (enter manually)")
                                        .default(0)
                                        .interact()?;

                                match selection {
                                    0 => {
                                        updates.push(EnvironmentVariableUpdate {
                                            key: "NODE_ENV".to_string(),
                                            value: "production".to_string(),
                                            component: missing_key.component.clone(),
                                        });
                                        continue;
                                    }
                                    1 => {
                                        updates.push(EnvironmentVariableUpdate {
                                            key: "NODE_ENV".to_string(),
                                            value: "development".to_string(),
                                            component: missing_key.component.clone(),
                                        });
                                        continue;
                                    }
                                    _ => {
                                        // Fall through to manual entry
                                    }
                                }
                            }

                            let prompt_text = if let Some(ref comp) = missing_key.component {
                                format!(
                                    "  Enter value for {} ({}:{})",
                                    missing_key.name, comp.component_type, comp.property
                                )
                            } else {
                                format!("  Enter value for {}", missing_key.name)
                            };

                            loop {
                                let value: String = Input::with_theme(&ColorfulTheme::default())
                                    .with_prompt(&prompt_text)
                                    .interact_text()?;

                                match validate_env_var_input(
                                    &missing_key.name,
                                    &value,
                                    &missing_key.component,
                                ) {
                                    Ok(_) => {
                                        updates.push(EnvironmentVariableUpdate {
                                            key: missing_key.name.clone(),
                                            value,
                                            component: missing_key.component.clone(),
                                        });
                                        break;
                                    }
                                    Err(err) => {
                                        stdout
                                            .set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                                        writeln!(stdout, "  [ERROR] {}", err)?;
                                        stdout.reset()?;
                                    }
                                }
                            }
                        }

                        if !updates.is_empty() {
                            // Save the variables
                            let update_url = if detail.component_type == "worker" {
                                format!(
                                    "{}/workers/{}/environments/{}/variables",
                                    get_platform_management_api_url(),
                                    detail.id,
                                    environment
                                )
                            } else {
                                format!(
                                    "{}/services/{}/environments/{}/variables",
                                    get_platform_management_api_url(),
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

                            let update_response =
                                http_client::put(&update_url, serde_json::to_value(&update_body)?)
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
