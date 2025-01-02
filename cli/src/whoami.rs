use crate::{
    core::{command::command, token::get_token},
    CliCommand,
};
use anyhow::Result;
use clap::{ArgMatches, Command};
use std::io::Write;
use termcolor::{ColorChoice, StandardStream};

#[derive(Debug)]
pub(super) struct WhoAmICommand;

impl WhoAmICommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for WhoAmICommand {
    fn command(&self) -> Command {
        command("whoami", "Get the current user")
    }

    fn handler(&self, _matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        // TODO: parse token and get all relevant user information
        writeln!(stdout, "{}", get_token()?)?;
        Ok(())
    }
}
