use anyhow::Result;
use clap::{ArgMatches, Command};
use std::io::Write;
use termcolor::{ColorChoice, StandardStream};

use crate::{core::command::command, CliCommand};

#[derive(Debug)]
pub(crate) struct VersionCommand;

impl VersionCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for VersionCommand {
    fn command(&self) -> Command {
        command("version", "Get the current version of forklaunch")
    }

    fn handler(&self, _matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        writeln!(stdout, "{}", env!("CARGO_PKG_VERSION"))?;
        Ok(())
    }
}
