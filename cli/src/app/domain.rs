use std::io::Write;

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
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
pub(crate) struct DomainCommand {
    status: StatusCommand,
}

impl DomainCommand {
    pub(crate) fn new() -> Self {
        Self {
            status: StatusCommand::new(),
        }
    }
}

impl CliCommand for DomainCommand {
    fn command(&self) -> Command {
        command("domain", "Inspect this application's custom domain")
            .subcommand_required(true)
            .subcommand(self.status.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("status", sub_matches)) => self.status.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}

#[derive(Debug)]
struct StatusCommand;

impl StatusCommand {
    fn new() -> Self {
        Self
    }
}

impl CliCommand for StatusCommand {
    fn command(&self) -> Command {
        command(
            "status",
            "Show custom-domain validation status for this application",
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

        let url = format!(
            "{}/applications/{}/custom-domain",
            get_platform_management_api_url(),
            urlencoding::encode(&application_id)
        );
        let response = http_client::get(&url).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if response.status().as_u16() == 204 {
            let mut stdout = StandardStream::stdout(ColorChoice::Always);
            writeln!(stdout, "No custom domain configured for this application.")?;
            return Ok(());
        }
        if !response.status().is_success() {
            bail!(
                "Failed to get custom domain status: {}",
                response.text().unwrap_or_default()
            );
        }

        let domain: CustomDomainStatus = response
            .json()
            .with_context(|| "Failed to parse custom domain response")?;

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
        writeln!(stdout, "{}", domain.domain)?;
        stdout.reset()?;
        writeln!(stdout)?;
        writeln!(stdout, "  status:   {}", domain.status)?;
        if let Some(err) = &domain.error_message {
            writeln!(stdout, "  error:    {}", err)?;
        }
        if let Some(records) = &domain.validation_records {
            if !records.is_empty() {
                writeln!(stdout)?;
                writeln!(stdout, "  DNS validation records:")?;
                for r in records {
                    writeln!(
                        stdout,
                        "    {} {} -> {}",
                        r.record_type.as_deref().unwrap_or("CNAME"),
                        r.name.as_deref().unwrap_or("-"),
                        r.value.as_deref().unwrap_or("-")
                    )?;
                }
            }
        }
        writeln!(stdout)?;

        Ok(())
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ValidationRecord {
    #[serde(default, rename = "type")]
    record_type: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    value: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CustomDomainStatus {
    #[serde(default)]
    id: Option<String>,
    domain: String,
    status: String,
    #[serde(default)]
    error_message: Option<String>,
    #[serde(default)]
    validation_records: Option<Vec<ValidationRecord>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn domain_cmd() -> Command {
        DomainCommand::new().command().version("0.0.0-test")
    }

    #[test]
    fn command_definition_is_valid() {
        domain_cmd().debug_assert();
    }

    #[test]
    fn requires_a_subcommand() {
        assert!(domain_cmd().try_get_matches_from(["domain"]).is_err());
        assert!(
            domain_cmd()
                .try_get_matches_from(["domain", "status"])
                .is_ok()
        );
    }

    #[test]
    fn custom_domain_status_deserializes() {
        let json = r#"{
            "id": "cd-1",
            "domain": "example.com",
            "status": "validated",
            "validationRecords": [{"type": "CNAME", "name": "_acme.example.com", "value": "abc.acm-validations.aws"}]
        }"#;
        let domain: CustomDomainStatus = serde_json::from_str(json).unwrap();
        assert_eq!(domain.domain, "example.com");
        assert_eq!(domain.status, "validated");
        assert_eq!(domain.validation_records.unwrap().len(), 1);
    }
}
