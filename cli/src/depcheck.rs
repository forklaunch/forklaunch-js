use clap::{ArgMatches, Command};

use crate::utils::forklaunch_command;

pub(crate) fn command() -> Command {
    forklaunch_command("depcheck", "Checks that dependencies are up to date and aligned across projects. More info about dependency topologies can be found here: ...")
}

pub(crate) fn handler(matches: &ArgMatches) {
    println!("{:?}", matches);
}
