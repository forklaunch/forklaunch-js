use anyhow::Result;
use clap::{Arg, ArgMatches, Command};

use crate::{core::command::command, CliCommand};

pub(crate) mod application;
pub(crate) mod project;

// TODO: add injected token into struct
#[derive(Debug)]
pub(crate) struct ChangeCommand;

impl ChangeCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ChangeCommand {
    fn command(&self) -> Command {
        command("change", "Change a forklaunch project").arg(Arg::new("base_path").short('b'))
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        // detect where command is called from if base_path not supplied

        // based on base_path, ask for choices (application, service, worker, etc.)

        // Perform in-place changes, trying to preserve changes
        // Do not hard fail if cannot perform action -- emit warning
        Ok(())
    }
}
