use std::fs::remove_file;
use std::io::Write;

use anyhow::Result;
use clap::{ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::core::command::command;
use crate::core::token::get_token_path;
use crate::CliCommand;

pub(super) struct LogoutCommand;

impl LogoutCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for LogoutCommand {
    fn command(&self) -> Command {
        command("logout", "Log out of the forklaunch platform")
    }

    fn handler(&self, _matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        // TODO: call logout API and serialize to ~/.forklaunch/token
        let token_path = get_token_path()?;
        remove_file(token_path)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "Successfully logged out!")?;
        stdout.reset()?;
        Ok(())
    }
}
