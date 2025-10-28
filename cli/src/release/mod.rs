use anyhow::Result;
use clap::{ArgMatches, Command};
use create::CreateCommand;

use crate::{CliCommand, core::command::command};

mod create;
mod git;
mod manifest_generator;

#[derive(Debug)]
pub(crate) struct ReleaseCommand {
    create: CreateCommand,
}

impl ReleaseCommand {
    pub(crate) fn new() -> Self {
        Self {
            create: CreateCommand::new(),
        }
    }
}

impl CliCommand for ReleaseCommand {
    fn command(&self) -> Command {
        command("release", "Release management").subcommand(self.create.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("create", sub_matches)) => self.create.handler(sub_matches),
            // Default to create for convenience
            None => self.create.handler(matches),
            _ => unreachable!(),
        }
    }
}
