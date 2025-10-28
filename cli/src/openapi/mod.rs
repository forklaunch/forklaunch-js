use anyhow::Result;
use clap::{ArgMatches, Command};
use export::ExportCommand;

use crate::{CliCommand, core::command::command};

mod export;

#[derive(Debug)]
pub(crate) struct OpenApiCommand {
    export: ExportCommand,
}

impl OpenApiCommand {
    pub(crate) fn new() -> Self {
        Self {
            export: ExportCommand::new(),
        }
    }
}

impl CliCommand for OpenApiCommand {
    fn command(&self) -> Command {
        command("openapi", "OpenAPI specification management")
            .subcommand(self.export.command())
            .subcommand_required(true)
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("export", sub_matches)) => self.export.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
