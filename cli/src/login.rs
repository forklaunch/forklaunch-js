use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::utils::forklaunch_command;

pub(crate) fn command() -> Command {
    forklaunch_command("login", "Login to the forklaunch platform")
}

pub(crate) fn handler(matches: &ArgMatches) -> Result<()> {
    println!("{:?}", matches);
    Ok(())
}
