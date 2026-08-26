use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::{CliCommand, core::command::command};

mod summary;

use summary::SummaryCommand;

#[derive(Debug)]
pub(crate) struct ManagedCommand {
    summary: SummaryCommand,
}

impl ManagedCommand {
    pub(crate) fn new() -> Self {
        Self {
            summary: SummaryCommand::new(),
        }
    }
}

impl CliCommand for ManagedCommand {
    fn command(&self) -> Command {
        command(
            "managed",
            "Inspect managed app instances and the OAuth relay that routes their sign-ins",
        )
        .subcommand(self.summary.command())
        .subcommand_required(true)
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("summary", sub_matches)) => self.summary.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
