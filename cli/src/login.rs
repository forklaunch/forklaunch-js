use std::{fs::{create_dir_all, write}, io::Write};

use anyhow::Result;
use clap::{ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::{command::command, token::get_token_path},
};

pub(super) struct LoginCommand;

impl LoginCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for LoginCommand {
    fn command(&self) -> Command {
        command("login", "Login to the forklaunch platform")
    }

    fn handler(&self, _matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        // TODO: call login API and serialize to ~/.forklaunch/token
        let token_path = get_token_path()?;
        // Create parent directory if it doesn't exist
        if let Some(parent) = token_path.parent() {
            create_dir_all(parent)?;
        }
        write(token_path, "TOKEN_CONTENT")?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "Successfully logged in!")?;
        stdout.reset()?;
        Ok(())
    }
}
