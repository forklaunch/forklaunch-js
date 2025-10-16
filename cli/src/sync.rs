use anyhow::Result;
use clap::{ArgMatches, Command};
use all::SyncAllCommand;
// use service::ServiceCommand;

use crate::{
    CliCommand, 
    core::command::command, 
};

pub(crate) mod constants;
pub(crate) mod utils;
pub(crate) mod all;
pub(crate) mod library;
pub(crate) mod module;
pub(crate) mod router;
pub(crate) mod service;
pub(crate) mod worker;

#[derive(Debug)]
pub(crate) struct SyncCommand {
    all: SyncAllCommand,
    // service: ServiceCommand,
}

impl SyncCommand {
    pub(crate) fn new() -> Self {
        Self {
            all: SyncAllCommand::new(),
            // service: ServiceCommand::new(),
        }
    }
}

impl CliCommand for SyncCommand {
    fn command(&self) -> Command {
        command("sync", "Sync the application directories with application artifacts")
            .subcommand(self.all.command())
            // .subcommand(self.service.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("all", sub_matches)) => self.all.handler(sub_matches),
            // Some(("service", sub_matches)) => self.service.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}