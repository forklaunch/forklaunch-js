use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::{CliCommand, core::command::command, sdk::mode::ModeCommand};

pub(crate) mod mode;

#[derive(Debug)]
pub(crate) struct SdkCommand {
    mode: ModeCommand,
}

impl SdkCommand {
    pub(crate) fn new() -> Self {
        Self {
            mode: ModeCommand::new(),
        }
    }
}

impl CliCommand for SdkCommand {
    fn command(&self) -> Command {
        command("sdk", "Manage SDKs")
            .subcommand_required(true)
            .subcommand(self.mode.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("mode", sub_matches)) => self.mode.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
