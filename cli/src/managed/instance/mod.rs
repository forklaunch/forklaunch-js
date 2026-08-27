use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::{CliCommand, core::command::command};

mod claim;
mod claim_link;
mod create;
mod destroy;
mod list;
mod vars;

use claim::ClaimCommand;
use claim_link::ClaimLinkCommand;
use create::CreateCommand;
use destroy::DestroyCommand;
use list::ListCommand;
use vars::VarsCommand;

#[derive(Debug)]
pub(super) struct InstanceCommand {
    list: ListCommand,
    create: CreateCommand,
    claim_link: ClaimLinkCommand,
    claim: ClaimCommand,
    destroy: DestroyCommand,
    vars: VarsCommand,
}

impl InstanceCommand {
    pub(super) fn new() -> Self {
        Self {
            list: ListCommand::new(),
            create: CreateCommand::new(),
            claim_link: ClaimLinkCommand::new(),
            claim: ClaimCommand::new(),
            destroy: DestroyCommand::new(),
            vars: VarsCommand::new(),
        }
    }
}

impl CliCommand for InstanceCommand {
    fn command(&self) -> Command {
        command(
            "instance",
            "Launch and manage managed instances of your app templates",
        )
        .long_about(
            "Launch and manage managed instances of your app templates.\n\n\
             Each instance is one running copy of a template, provisioned for a single end\n\
             customer with its own deployment. A newly created instance also gets a ONE-TIME\n\
             claim link, which is how the customer takes ownership.\n\n\
             TWO COMMANDS HAVE SIMILAR NAMES AND OPPOSITE AUDIENCES:\n\n\
             \x20 `claim-link`  REVEALS the one-time link. You run this — the operator. It\n\
             \x20               requires login, and the link is destroyed on reveal, so it can\n\
             \x20               be run only once per instance.\n\
             \x20 `claim`       CONSUMES the one-time link. YOUR CUSTOMER runs this, on their\n\
             \x20               own machine. It requires NO ForkLaunch account at all.\n\n\
             The normal sequence is: you `create`, you `claim-link`, you hand the output to\n\
             the customer, and the customer `claim`s it.\n\n\
             `vars` is the one thing that can come BEFORE `create`. If the template declares\n\
             a REQUIRED custom variable, the instance will not provision until it has a\n\
             value — run `vars list` to see which are still missing.",
        )
        .subcommand(self.list.command())
        .subcommand(self.create.command())
        .subcommand(self.claim_link.command())
        .subcommand(self.claim.command())
        .subcommand(self.destroy.command())
        .subcommand(self.vars.command())
        .subcommand_required(true)
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("list", sub_matches)) => self.list.handler(sub_matches),
            Some(("create", sub_matches)) => self.create.handler(sub_matches),
            Some(("claim-link", sub_matches)) => self.claim_link.handler(sub_matches),
            Some(("claim", sub_matches)) => self.claim.handler(sub_matches),
            Some(("destroy", sub_matches)) => self.destroy.handler(sub_matches),
            Some(("vars", sub_matches)) => self.vars.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
