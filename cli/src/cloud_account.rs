use std::io::Write;

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_platform_management_api_url},
    core::{command::command, http_client, validate::require_auth},
};

// ── Top-level command ─────────────────────────────────────────────────────────
// BYOC (bring-your-own-cloud) only — most customers use ForkLaunch-managed
// hosting and will never touch this command group.

#[derive(Debug)]
pub(crate) struct CloudAccountCommand {
    create: CreateCommand,
    link: LinkCommand,
    unlink: UnlinkCommand,
    validate: ValidateCommand,
}

impl CloudAccountCommand {
    pub(crate) fn new() -> Self {
        Self {
            create: CreateCommand::new(),
            link: LinkCommand::new(),
            unlink: UnlinkCommand::new(),
            validate: ValidateCommand::new(),
        }
    }
}

impl CliCommand for CloudAccountCommand {
    fn command(&self) -> Command {
        command(
            "cloud-account",
            "Manage a bring-your-own-cloud (BYOC) account link for this organization",
        )
        .subcommand(self.create.command())
        .subcommand(self.link.command())
        .subcommand(self.unlink.command())
        .subcommand(self.validate.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("create", sub_matches)) => self.create.handler(sub_matches),
            Some(("link", sub_matches)) => self.link.handler(sub_matches),
            Some(("unlink", sub_matches)) => self.unlink.handler(sub_matches),
            Some(("validate", sub_matches)) => self.validate.handler(sub_matches),
            _ => show_status(),
        }
    }
}

// ── Status (default action) ───────────────────────────────────────────────────

fn show_status() -> Result<()> {
    let _token = require_auth()?;

    let url = format!("{}/cloud-accounts", get_platform_management_api_url());
    let response = http_client::get(&url).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

    if response.status().as_u16() == 404 {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        writeln!(
            stdout,
            "No cloud account linked. Run `fl cloud-account create` to start."
        )?;
        return Ok(());
    }
    if !response.status().is_success() {
        bail!(
            "Failed to get cloud account: {}",
            response.text().unwrap_or_default()
        );
    }

    let account: CloudAccount = response
        .json()
        .with_context(|| "Failed to parse cloud account response")?;

    let mut stdout = StandardStream::stdout(ColorChoice::Always);
    writeln!(stdout)?;
    writeln!(stdout, "  provider:  {}", account.provider)?;
    writeln!(stdout, "  status:    {}", account.status)?;
    if let Some(arn) = &account.role_arn {
        writeln!(stdout, "  role arn:  {}", arn)?;
    }
    if let Some(err) = &account.validation_error {
        writeln!(stdout, "  error:     {}", err)?;
    }
    writeln!(stdout)?;

    Ok(())
}

// ── Create ────────────────────────────────────────────────────────────────────

#[derive(Debug)]
struct CreateCommand;

impl CreateCommand {
    fn new() -> Self {
        Self
    }
}

impl CliCommand for CreateCommand {
    fn command(&self) -> Command {
        command(
            "create",
            "Start linking a BYOC cloud account — returns setup instructions to run in your own AWS account",
        )
        .arg(
            Arg::new("provider")
                .long("provider")
                .default_value("aws")
                .help("Cloud provider (currently only aws)"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let provider = matches
            .get_one::<String>("provider")
            .map(String::as_str)
            .unwrap_or("aws");

        let url = format!("{}/cloud-accounts", get_platform_management_api_url());
        let body = serde_json::json!({ "provider": provider });
        let response =
            http_client::post(&url, body).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if !response.status().is_success() {
            bail!(
                "Failed to create cloud account: {}",
                response.text().unwrap_or_default()
            );
        }

        let result: CloudAccountWithSetup = response
            .json()
            .with_context(|| "Failed to parse cloud account response")?;

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        writeln!(stdout, "  Cloud account created ({})", result.account.id)?;
        stdout.reset()?;
        writeln!(stdout)?;
        writeln!(stdout, "  CloudFormation: {}", result.setup_instructions.cloud_formation_url)?;
        writeln!(stdout)?;
        writeln!(stdout, "  Terraform:")?;
        writeln!(stdout, "{}", result.setup_instructions.terraform_snippet)?;
        writeln!(stdout)?;
        writeln!(stdout, "  Manual steps:")?;
        for (i, step) in result.setup_instructions.manual_steps.iter().enumerate() {
            writeln!(stdout, "    {}. {}", i + 1, step)?;
        }
        writeln!(stdout)?;
        writeln!(
            stdout,
            "  Once done, run `fl cloud-account link --role-arn <arn>` to complete setup."
        )?;
        writeln!(stdout)?;

        Ok(())
    }
}

// ── Link ──────────────────────────────────────────────────────────────────────

#[derive(Debug)]
struct LinkCommand;

impl LinkCommand {
    fn new() -> Self {
        Self
    }
}

impl CliCommand for LinkCommand {
    fn command(&self) -> Command {
        command(
            "link",
            "Complete a cloud account link by providing the IAM role ARN",
        )
        .arg(
            Arg::new("id")
                .required(true)
                .help("The cloud account id (from `fl cloud-account create`)"),
        )
        .arg(
            Arg::new("role_arn")
                .long("role-arn")
                .required(true)
                .help("The IAM role ARN created in your AWS account"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let id = matches.get_one::<String>("id").context("id is required")?;
        let role_arn = matches
            .get_one::<String>("role_arn")
            .context("--role-arn is required")?;

        let url = format!("{}/cloud-accounts/{}", get_platform_management_api_url(), id);
        let body = serde_json::json!({ "roleArn": role_arn });
        let response =
            http_client::put(&url, body).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if !response.status().is_success() {
            bail!(
                "Failed to link cloud account: {}",
                response.text().unwrap_or_default()
            );
        }

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        writeln!(stdout, "  Linked")?;
        stdout.reset()?;

        Ok(())
    }
}

// ── Unlink ────────────────────────────────────────────────────────────────────

#[derive(Debug)]
struct UnlinkCommand;

impl UnlinkCommand {
    fn new() -> Self {
        Self
    }
}

impl CliCommand for UnlinkCommand {
    fn command(&self) -> Command {
        command("unlink", "Unlink the BYOC cloud account").arg(
            Arg::new("id")
                .required(true)
                .help("The cloud account id to unlink"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let id = matches.get_one::<String>("id").context("id is required")?;

        let url = format!("{}/cloud-accounts/{}", get_platform_management_api_url(), id);
        let response = http_client::delete(&url).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if !response.status().is_success() {
            bail!(
                "Failed to unlink cloud account: {}",
                response.text().unwrap_or_default()
            );
        }

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        writeln!(stdout, "  Unlinked")?;
        stdout.reset()?;

        Ok(())
    }
}

// ── Validate ──────────────────────────────────────────────────────────────────

#[derive(Debug)]
struct ValidateCommand;

impl ValidateCommand {
    fn new() -> Self {
        Self
    }
}

impl CliCommand for ValidateCommand {
    fn command(&self) -> Command {
        command("validate", "Re-validate an existing cloud account link").arg(
            Arg::new("id")
                .required(true)
                .help("The cloud account id to re-validate"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let id = matches.get_one::<String>("id").context("id is required")?;

        let url = format!(
            "{}/cloud-accounts/{}/validate",
            get_platform_management_api_url(),
            id
        );
        let response = http_client::post(&url, serde_json::json!({}))
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if !response.status().is_success() {
            bail!(
                "Failed to validate cloud account: {}",
                response.text().unwrap_or_default()
            );
        }

        let result: ValidateResponse = response
            .json()
            .with_context(|| "Failed to parse validate response")?;

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        writeln!(stdout, "  status: {}", result.status)?;
        if let Some(err) = &result.validation_error {
            writeln!(stdout, "  error:  {}", err)?;
        }

        Ok(())
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudAccount {
    #[serde(default)]
    id: Option<String>,
    provider: String,
    status: String,
    #[serde(default)]
    role_arn: Option<String>,
    #[serde(default)]
    validation_error: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SetupInstructions {
    cloud_formation_url: String,
    terraform_snippet: String,
    manual_steps: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct AccountSummary {
    id: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudAccountWithSetup {
    account: AccountSummary,
    setup_instructions: SetupInstructions,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ValidateResponse {
    status: String,
    #[serde(default)]
    validation_error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cloud_account_cmd() -> Command {
        CloudAccountCommand::new().command().version("0.0.0-test")
    }

    #[test]
    fn command_definition_is_valid() {
        cloud_account_cmd().debug_assert();
    }

    #[test]
    fn status_has_no_required_args() {
        assert!(cloud_account_cmd().try_get_matches_from(["cloud-account"]).is_ok());
    }

    #[test]
    fn link_requires_id_and_role_arn() {
        assert!(
            cloud_account_cmd()
                .try_get_matches_from(["cloud-account", "link"])
                .is_err()
        );
        assert!(
            cloud_account_cmd()
                .try_get_matches_from(["cloud-account", "link", "ca-1", "--role-arn", "arn:aws:iam::123:role/x"])
                .is_ok()
        );
    }

    #[test]
    fn unlink_requires_id() {
        assert!(
            cloud_account_cmd()
                .try_get_matches_from(["cloud-account", "unlink"])
                .is_err()
        );
    }

    #[test]
    fn cloud_account_with_setup_deserializes() {
        let json = r#"{
            "account": {"id": "ca-1"},
            "setupInstructions": {
                "cloudFormationUrl": "https://...",
                "terraformSnippet": "resource ...",
                "manualSteps": ["step 1", "step 2"]
            }
        }"#;
        let result: CloudAccountWithSetup = serde_json::from_str(json).unwrap();
        assert_eq!(result.account.id, "ca-1");
        assert_eq!(result.setup_instructions.manual_steps.len(), 2);
    }
}
