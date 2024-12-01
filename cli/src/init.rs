use anyhow::Result;
use application::ApplicationCommand;
use clap::{ArgMatches, Command};
use library::LibraryCommand;
use service::ServiceCommand;

use crate::{utils::forklaunch_command, CliCommand};

mod application;
mod core;
mod library;
mod service;

// TODO: add injected token into struct
#[derive(Debug)]
pub(crate) struct InitCommand {
    application: ApplicationCommand,
    library: LibraryCommand,
    service: ServiceCommand,
}

impl InitCommand {
    pub(crate) fn new() -> Self {
        Self {
            application: ApplicationCommand::new(),
            library: LibraryCommand::new(),
            service: ServiceCommand::new(),
        }
    }
}

impl CliCommand for InitCommand {
    fn command(&self) -> Command {
        forklaunch_command("init", "Initialize a new forklaunch project")
            .subcommand_required(true)
            .subcommand(self.application.command())
            .subcommand(self.library.command())
            .subcommand(self.service.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("application", sub_matches)) => self.application.handler(sub_matches),
            Some(("library", sub_matches)) => self.library.handler(sub_matches),
            Some(("service", sub_matches)) => self.service.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
