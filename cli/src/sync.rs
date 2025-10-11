use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::{
    CliCommand, 
    core::command::command, 
    sync::all::SyncAllCommand
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
            Some(("all", sub_matches)) => self.sync.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}