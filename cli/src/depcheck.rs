use clap::{ArgMatches, Command};

use crate::utils::forklaunch_command;

pub(crate) fn command() -> Command {
    forklaunch_command(
        "depcheck",
        "Checks that dependencies aligned across projects. More info: ...",
    )
}

pub(crate) fn handler(matches: &ArgMatches) {
    println!("{:?}", matches);
}
