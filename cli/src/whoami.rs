use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::utils::forklaunch_command;

pub(crate) fn command() -> Command {
    forklaunch_command("whoami", "Get the current user")
}

pub(crate) fn handler(matches: &ArgMatches) -> Result<()> {
    println!("{:?}", matches);
    Ok(())
}
