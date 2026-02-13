use std::{io::Write, thread::sleep, time::Duration};

use anyhow::{Context, Result, bail};
use serde::Deserialize;
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};

use crate::core::hmac::AuthMode;

#[derive(Debug, Deserialize)]
pub(crate) struct DeploymentStatus {
    #[allow(dead_code)]
    pub(crate) id: String,
    pub(crate) status: String,
    pub(crate) phase: Option<String>,
    #[serde(rename = "completedAt")]
    #[allow(dead_code)]
    pub(crate) completed_at: Option<String>,
    pub(crate) endpoints: Option<DeploymentEndpoints>,
    pub(crate) error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct DeploymentEndpoints {
    pub(crate) api: Option<String>,
    pub(crate) docs: Option<String>,
}

pub(crate) fn stream_deployment_status(
    auth_mode: &AuthMode,
    deployment_id: &str,
    stdout: &mut StandardStream,
) -> Result<()> {
    use crate::core::http_client;

    let url = if auth_mode.is_hmac() {
        format!(
            "{}/internal/deployments/{}",
            crate::constants::get_platform_management_api_url(),
            deployment_id
        )
    } else {
        format!(
            "{}/deployments/{}",
            crate::constants::get_platform_management_api_url(),
            deployment_id
        )
    };
    let mut last_phase: Option<String> = None;

    loop {
        // Polling deployment status
        let response = http_client::get_with_auth(auth_mode, &url)?;

        if !response.status().is_success() {
            let response_text = response
                .text()
                .with_context(|| "Failed to read status response")?;
            bail!("Failed to get deployment status: {}", response_text);
        }

        let response_text = response
            .text()
            .with_context(|| "Failed to read status response")?;

        let status: DeploymentStatus = serde_json::from_str(&response_text)
            .with_context(|| format!("Failed to parse deployment status: {}", response_text))?;

        if let Some(phase) = &status.phase {
            if last_phase.as_ref() != Some(phase) {
                display_phase_update(phase, stdout)?;
                last_phase = Some(phase.clone());
            }
        }

        match status.status.as_str() {
            "completed" => {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
                writeln!(stdout, "\n[OK] Operation successful!")?;
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
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)).set_bold(true))?;
                writeln!(stdout, "\n[ERROR] Operation failed")?;
                stdout.reset()?;

                if let Some(error) = status.error {
                    writeln!(stdout, "[ERROR] Error: {}", error)?;
                }
                bail!("Operation failed");
            }
            _ => {
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
        "destroying_services" => "  Destroying services...",
        "destroying_load_balancer" => "  Destroying load balancer...",
        "destroying_network" => "  Destroying network infrastructure...",
        "destroying_cache" => "  Destroying cache...",
        "destroying_database" => "  Destroying database...",
        _ => phase,
    };
    writeln!(stdout, "{}", message)?;
    stdout.reset()?;
    Ok(())
}
