use std::io::Write;

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use serde::Deserialize;
use termcolor::{ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_platform_management_api_url},
    core::{
        command::command,
        http_client,
        validate::{require_auth, require_integration, require_manifest},
    },
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeploymentSummary {
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    environment: Option<String>,
    #[serde(default)]
    region: Option<String>,
    #[serde(default)]
    release_version: Option<String>,
    #[serde(default)]
    deployed_by: Option<String>,
    #[serde(default)]
    started_at: Option<String>,
    #[serde(default)]
    completed_at: Option<String>,
    #[serde(default)]
    error_message: Option<String>,
    #[serde(default)]
    metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct DeploymentListResponse {
    #[serde(default)]
    deployments: Vec<DeploymentSummary>,
}

fn print_field(out: &mut StandardStream, label: &str, value: &Option<String>) -> Result<()> {
    if let Some(v) = value {
        out.set_color(ColorSpec::new().set_bold(true))?;
        write!(out, "  {:<12}", label)?;
        out.reset()?;
        writeln!(out, "{}", v)?;
    }
    Ok(())
}

/// Pulumi's generated program exports one `url_<service>` output per service
/// (see the deploy pipeline's Pulumi codegen); the worker persists the raw
/// stack outputs onto `deployment.metadata.outputs` on completion. Surface
/// them here so a service's URL can be looked up after the fact, not just
/// during the one foreground `deploy create` run that happened to produce it.
fn print_service_urls(out: &mut StandardStream, metadata: &Option<serde_json::Value>) -> Result<()> {
    let Some(outputs) = metadata.as_ref().and_then(|m| m.get("outputs")) else {
        return Ok(());
    };
    let Some(outputs) = outputs.as_object() else {
        return Ok(());
    };

    let mut urls: Vec<(&str, &str)> = outputs
        .iter()
        .filter_map(|(key, value)| {
            let service_name = key.strip_prefix("url_")?;
            let url = value.as_str()?;
            Some((service_name, url))
        })
        .collect();
    urls.sort_by_key(|(name, _)| *name);

    if urls.is_empty() {
        return Ok(());
    }

    out.set_color(ColorSpec::new().set_bold(true))?;
    write!(out, "  {:<12}", "URLs:")?;
    out.reset()?;
    writeln!(out)?;
    for (service_name, url) in urls {
        writeln!(out, "    {:<20}{}", service_name, url)?;
    }
    Ok(())
}

#[derive(Debug)]
pub(crate) struct InfoCommand;

impl InfoCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for InfoCommand {
    fn command(&self) -> Command {
        command(
            "info",
            "Show deployment status (latest per environment/region, or one by id)",
        )
        .arg(
            Arg::new("deployment")
                .long("deployment")
                .short('d')
                .help("Deployment id to show"),
        )
        .arg(
            Arg::new("environment")
                .long("environment")
                .short('e')
                .help("Filter to an environment"),
        )
        .arg(
            Arg::new("region")
                .long("region")
                .short('r')
                .help("Filter to a region"),
        )
        .arg(
            Arg::new("base_path")
                .long("path")
                .short('p')
                .help("Path to application root (optional)"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let (_app_root, manifest) = require_manifest(matches)?;
        let app = require_integration(&manifest)?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        // When an explicit deployment id is given, fetch it directly by id so we
        // never miss deployments that fall outside a capped list page.
        let owned: Vec<DeploymentSummary> = match matches.get_one::<String>("deployment") {
            Some(id) => {
                let url = format!(
                    "{}/deployments/{}",
                    get_platform_management_api_url(),
                    id
                );
                let response =
                    http_client::get(&url).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;
                if response.status().as_u16() == 404 {
                    bail!("Deployment '{}' not found.", id);
                }
                if !response.status().is_success() {
                    bail!(
                        "Failed to get deployment: {}",
                        response.text().unwrap_or_default()
                    );
                }
                let deployment: DeploymentSummary = response
                    .json()
                    .with_context(|| "Failed to parse deployment response")?;
                vec![deployment]
            }
            None => {
                let mut url = format!(
                    "{}/deployments/?applicationId={}&limit=25",
                    get_platform_management_api_url(),
                    app
                );
                if let Some(environment) = matches.get_one::<String>("environment") {
                    url.push_str(&format!("&environment={}", environment));
                }
                if let Some(region) = matches.get_one::<String>("region") {
                    url.push_str(&format!("&region={}", region));
                }

                let response =
                    http_client::get(&url).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;
                if !response.status().is_success() {
                    bail!(
                        "Failed to list deployments: {}",
                        response.text().unwrap_or_default()
                    );
                }
                let list: DeploymentListResponse = response
                    .json()
                    .with_context(|| "Failed to parse deployment list response")?;
                list.deployments.into_iter().take(5).collect()
            }
        };

        if owned.is_empty() {
            log_info!(stdout, "No deployments found for the given filters.");
            return Ok(());
        }

        for deployment in &owned {
            writeln!(stdout)?;
            print_field(&mut stdout, "Id:", &deployment.id)?;
            print_field(&mut stdout, "Status:", &deployment.status)?;
            print_field(&mut stdout, "Env:", &deployment.environment)?;
            print_field(&mut stdout, "Region:", &deployment.region)?;
            print_field(&mut stdout, "Release:", &deployment.release_version)?;
            print_field(&mut stdout, "By:", &deployment.deployed_by)?;
            print_field(&mut stdout, "Started:", &deployment.started_at)?;
            print_field(&mut stdout, "Completed:", &deployment.completed_at)?;
            print_field(&mut stdout, "Error:", &deployment.error_message)?;
            print_service_urls(&mut stdout, &deployment.metadata)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn deployment_summary_deserializes_metadata_outputs() {
        let json = r#"{
            "id": "d1",
            "status": "completed",
            "metadata": {
                "outputs": {
                    "url_iam": "http://alb-1.us-east-1.elb.amazonaws.com",
                    "url_billing": "http://alb-2.us-east-1.elb.amazonaws.com",
                    "vpcId": "vpc-123"
                }
            }
        }"#;
        let summary: DeploymentSummary = serde_json::from_str(json).unwrap();
        let outputs = summary
            .metadata
            .as_ref()
            .and_then(|m| m.get("outputs"))
            .and_then(|o| o.as_object())
            .unwrap();
        assert_eq!(
            outputs.get("url_iam").and_then(|v| v.as_str()),
            Some("http://alb-1.us-east-1.elb.amazonaws.com")
        );
    }

    #[test]
    fn print_service_urls_handles_missing_metadata() {
        let mut stdout = StandardStream::stdout(ColorChoice::Never);
        assert!(print_service_urls(&mut stdout, &None).is_ok());
    }

    #[test]
    fn print_service_urls_handles_metadata_with_no_outputs() {
        let mut stdout = StandardStream::stdout(ColorChoice::Never);
        let metadata = Some(json!({ "resources": [] }));
        assert!(print_service_urls(&mut stdout, &metadata).is_ok());
    }

    #[test]
    fn print_service_urls_filters_non_url_output_keys() {
        let mut stdout = StandardStream::stdout(ColorChoice::Never);
        let metadata = Some(json!({
            "outputs": {
                "url_iam": "http://alb.example.com",
                "vpcId": "vpc-123",
                "url_billing": "http://alb2.example.com"
            }
        }));
        assert!(print_service_urls(&mut stdout, &metadata).is_ok());
    }
}
