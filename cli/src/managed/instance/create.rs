use std::io::Write;

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use serde_json::json;
use termcolor::{ColorChoice, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::command::command,
    managed::{
        client::{Missing, post_json, print_dryrun, require_managed_mode, resolve_managed_auth},
        types::ManagedInstance,
    },
};

#[derive(Debug)]
pub(super) struct CreateCommand;

impl CreateCommand {
    pub(super) fn new() -> Self {
        Self
    }
}

impl CliCommand for CreateCommand {
    fn command(&self) -> Command {
        command(
            "create",
            "Launch a managed instance of a published template",
        )
        .long_about(
            "Launch a managed instance of a published template.\n\n\
                 This provisions a deployment for one end customer. The template must already\n\
                 have a published version — launching from a draft or unbuilt template fails.\n\n\
                 Provisioning is asynchronous: the instance comes back in a provisioning state\n\
                 and becomes claimable once it is up. Once it reaches awaiting_claim, reveal\n\
                 its one-time claim link with `forklaunch managed instance claim-link`.",
        )
        .arg(
            Arg::new("template")
                .long("template")
                .required(true)
                .help("Slug of the published template to launch"),
        )
        .arg(
            Arg::new("region")
                .long("region")
                .required(true)
                .help("Region to provision the instance in (for example: us-west-2)"),
        )
        .arg(
            Arg::new("dryrun")
                .long("dryrun")
                .help("Print the request that would be sent without sending it")
                .action(ArgAction::SetTrue),
        )
        .arg(
            Arg::new("json")
                .long("json")
                .help("Output raw JSON instead of formatted terminal output")
                .action(ArgAction::SetTrue),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let template = matches
            .get_one::<String>("template")
            .context("--template is required")?;
        let region = matches
            .get_one::<String>("region")
            .context("--region is required")?;

        let body = json!({ "templateSlug": template, "region": region });

        if matches.get_flag("dryrun") {
            return print_dryrun("POST", "/instances", Some(&body));
        }

        let auth_mode = resolve_managed_auth()?;
        require_managed_mode(&auth_mode)?;

        // A 404 here is the platform saying there is no *published* template by that
        // slug, which is a different problem from the endpoint being absent — name the
        // template so the message points at the real cause.
        let instance: ManagedInstance = post_json(
            &auth_mode,
            "/instances",
            body,
            Missing::Resource(format!("published template '{}'", template)),
        )?;

        if matches.get_flag("json") {
            println!("{}", serde_json::to_string_pretty(&instance)?);
            return Ok(());
        }

        log_ok!(
            stdout,
            "Launched instance of '{}' in {}",
            instance
                .template_slug
                .as_deref()
                .unwrap_or(template.as_str()),
            instance.region.as_deref().unwrap_or(region.as_str())
        );
        if let Some(id) = instance.id.as_deref() {
            log_info!(stdout, "Instance id: {}", id);
        }
        if let Some(host) = instance.host.as_deref() {
            log_info!(stdout, "Host: {}", host);
        }
        if let Some(state) = instance.state.as_deref() {
            log_info!(stdout, "State: {}", state);
        }

        writeln!(stdout)?;
        log_info!(
            stdout,
            "Provisioning runs in the background. Watch it with `forklaunch managed instance list`."
        );
        if let Some(id) = instance.id.as_deref() {
            log_info!(
                stdout,
                "Once it reaches awaiting_claim, hand the customer their claim link: forklaunch managed instance claim-link --id {}",
                id
            );
        }

        Ok(())
    }
}
