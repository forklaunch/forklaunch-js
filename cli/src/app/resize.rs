use std::io::Write;

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgAction, ArgMatches, Command};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_platform_management_api_url},
    core::{
        command::command,
        http_client,
        validate::{require_auth, require_integration, require_manifest},
    },
};

#[derive(Debug)]
pub(crate) struct ResizeCommand;

impl ResizeCommand {
    pub(crate) fn new() -> Self {
        Self
    }
}

impl CliCommand for ResizeCommand {
    fn command(&self) -> Command {
        command(
            "resize",
            "Resize one or more services/workers — creates a new release and triggers a deployment",
        )
        .arg(
            Arg::new("environment")
                .short('e')
                .long("environment")
                .required(true)
                .help("Environment to deploy the resize into"),
        )
        .arg(
            Arg::new("region")
                .short('r')
                .long("region")
                .required(true)
                .help("Region to deploy the resize into"),
        )
        .arg(
            Arg::new("size")
                .long("size")
                .required(true)
                .action(ArgAction::Append)
                .help("<service-or-worker-id>=<instance-size>, repeatable (e.g. --size svc-1=t3.medium)"),
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("Path to application root (optional)"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let (_app_root, manifest) = require_manifest(matches)?;
        let application_id = require_integration(&manifest)?;
        let environment = matches
            .get_one::<String>("environment")
            .context("--environment is required")?;
        let region = matches
            .get_one::<String>("region")
            .context("--region is required")?;
        let sizes: Vec<&String> = matches
            .get_many::<String>("size")
            .context("--size is required")?
            .collect();

        let mut instance_sizes = serde_json::Map::new();
        for entry in &sizes {
            let (id, size) = entry
                .split_once('=')
                .with_context(|| format!("--size '{}' must be <id>=<size>", entry))?;
            instance_sizes.insert(id.to_string(), serde_json::Value::String(size.to_string()));
        }

        let body = serde_json::json!({
            "applicationId": application_id,
            "environment": environment,
            "region": region,
            "instanceSizes": instance_sizes,
        });

        let url = format!("{}/instance-sizes", get_platform_management_api_url());
        let response =
            http_client::post(&url, body).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if !response.status().is_success() {
            bail!(
                "Failed to resize: {}",
                response.text().unwrap_or_default()
            );
        }

        let result: ResizeResponse = response
            .json()
            .with_context(|| "Failed to parse resize response")?;

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        write!(stdout, "  Deploying resize")?;
        stdout.reset()?;
        writeln!(
            stdout,
            "  release {} ({}), deployment {}",
            result.release_version, result.release_id, result.deployment_id
        )?;
        writeln!(stdout, "  {}", result.message)?;

        Ok(())
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResizeResponse {
    message: String,
    release_id: String,
    release_version: String,
    deployment_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn resize_cmd() -> Command {
        ResizeCommand::new().command().version("0.0.0-test")
    }

    #[test]
    fn command_definition_is_valid() {
        resize_cmd().debug_assert();
    }

    #[test]
    fn requires_env_region_and_size() {
        assert!(resize_cmd().try_get_matches_from(["resize"]).is_err());
        assert!(
            resize_cmd()
                .try_get_matches_from([
                    "resize", "-e", "dev", "-r", "us-east-1", "--size", "svc-1=t3.medium"
                ])
                .is_ok()
        );
    }

    #[test]
    fn size_accepts_multiple_entries() {
        let matches = resize_cmd()
            .try_get_matches_from([
                "resize",
                "-e",
                "dev",
                "-r",
                "us-east-1",
                "--size",
                "svc-1=t3.medium",
                "--size",
                "worker-1=t3.small",
            ])
            .unwrap();
        let sizes: Vec<&String> = matches.get_many::<String>("size").unwrap().collect();
        assert_eq!(sizes.len(), 2);
    }

    #[test]
    fn resize_response_deserializes() {
        let json = r#"{
            "message": "Deployment triggered",
            "releaseId": "rel-1",
            "releaseVersion": "1.0.1",
            "deploymentId": "dep-1"
        }"#;
        let response: ResizeResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.release_version, "1.0.1");
    }
}
