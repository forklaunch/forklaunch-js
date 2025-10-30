use all::SyncAllCommand;
use anyhow::Result;
use clap::{ArgMatches, Command};
use library::LibrarySyncCommand;
use service::ServiceSyncCommand;
use worker::WorkerSyncCommand;

use crate::{CliCommand, core::command::command};

pub(crate) mod all;
pub(crate) mod library;
pub(crate) mod service;
pub(crate) mod worker;

#[derive(Debug)]
pub(crate) struct SyncCommand {
    all: SyncAllCommand,
    service: ServiceSyncCommand,
    worker: WorkerSyncCommand,
    library: LibrarySyncCommand,
}

impl SyncCommand {
    pub(crate) fn new() -> Self {
        Self {
            all: SyncAllCommand::new(),
            service: ServiceSyncCommand::new(),
            worker: WorkerSyncCommand::new(),
            library: LibrarySyncCommand::new(),
        }
    }
}

impl CliCommand for SyncCommand {
    fn command(&self) -> Command {
        command(
            "sync",
            "Sync the application directories with application artifacts",
        )
        .subcommand(self.all.command())
        .subcommand(self.service.command())
        .subcommand(self.worker.command())
        .subcommand(self.library.command())
        .subcommand_required(true)
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("all", sub_matches)) => self.all.handler(sub_matches),
            Some(("service", sub_matches)) => self.service.handler(sub_matches),
            Some(("worker", sub_matches)) => self.worker.handler(sub_matches),
            Some(("library", sub_matches)) => self.library.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
