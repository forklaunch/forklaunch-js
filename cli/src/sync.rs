use anyhow::Result;
use clap::{ArgMatches, Command};
use sync::SyncAllCommand;

use crate::{CliCommand, core::command::command};

pub(crate) mod sync;

#[derive(Debug)]
pub(crate) struct SyncCommand {
    sync: SyncAllCommand,
}

impl SyncCommand {
    pub(crate) fn new() -> Self {
        Self {
            sync: SyncAllCommand::new(),
        }
    }
}

impl CliCommand for SyncCommand {
    fn command(&self) -> Command {
        command("sync", "Sync the application directories with application artifacts")
            .subcommand(self.sync.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("sync", sub_matches)) => self.sync.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}