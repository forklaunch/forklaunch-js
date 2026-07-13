use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::{CliCommand, core::command::command};

mod config_set;
mod list;
mod mutation;
mod resize;
mod resource_resolver;
mod status;
mod types;

use config_set::ConfigSetCommand;
use list::ListCommand;
use resize::ResizeCommand;
use status::StatusCommand;

#[derive(Debug)]
pub(crate) struct InfraCommand {
    list: ListCommand,
    status: StatusCommand,
    resize: ResizeCommand,
    config_set: ConfigSetCommand,
}

impl InfraCommand {
    pub(crate) fn new() -> Self {
        Self {
            list: ListCommand::new(),
            status: StatusCommand::new(),
            resize: ResizeCommand::new(),
            config_set: ConfigSetCommand::new(),
        }
    }
}

impl CliCommand for InfraCommand {
    fn command(&self) -> Command {
        command(
            "infra",
            "Inspect and manage provisioned database, cache, and queue infrastructure",
        )
        .subcommand(self.list.command())
        .subcommand(self.status.command())
        .subcommand(self.resize.command())
        .subcommand(self.config_set.command())
        .subcommand_required(true)
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("list", sub_matches)) => self.list.handler(sub_matches),
            Some(("status", sub_matches)) => self.status.handler(sub_matches),
            Some(("resize", sub_matches)) => self.resize.handler(sub_matches),
            Some(("config-set", sub_matches)) => self.config_set.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
