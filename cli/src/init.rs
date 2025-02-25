use anyhow::Result;
use application::ApplicationCommand;
use clap::{ArgMatches, Command};
use include_dir::{include_dir, Dir};
use library::LibraryCommand;
use router::RouterCommand;
use service::ServiceCommand;
use worker::WorkerCommand;

use crate::{core::command::command, CliCommand};

pub(crate) mod application;
pub(crate) mod core;
pub(crate) mod library;
pub(crate) mod router;
pub(crate) mod service;
pub(crate) mod worker;

pub(crate) static TEMPLATES_DIR: Dir = include_dir!("src/templates");

// TODO: add injected token into struct
#[derive(Debug)]
pub(crate) struct InitCommand {
    application: ApplicationCommand,
    library: LibraryCommand,
    service: ServiceCommand,
    router: RouterCommand,
    worker: WorkerCommand,
}

impl InitCommand {
    pub(crate) fn new() -> Self {
        Self {
            application: ApplicationCommand::new(),
            library: LibraryCommand::new(),
            service: ServiceCommand::new(),
            router: RouterCommand::new(),
            worker: WorkerCommand::new(),
        }
    }
}

impl CliCommand for InitCommand {
    fn command(&self) -> Command {
        command("init", "Initialize a new forklaunch project")
            .alias("add")
            .subcommand_required(true)
            .subcommand(self.application.command())
            .subcommand(self.library.command())
            .subcommand(self.service.command())
            .subcommand(self.router.command())
            .subcommand(self.worker.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("application", sub_matches)) => self.application.handler(sub_matches),
            Some(("library", sub_matches)) => self.library.handler(sub_matches),
            Some(("service", sub_matches)) => self.service.handler(sub_matches),
            Some(("router", sub_matches)) => self.router.handler(sub_matches),
            Some(("worker", sub_matches)) => self.worker.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
