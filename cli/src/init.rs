use clap::{ArgMatches, Command};

use crate::utils::forklaunch_command;

mod application;
mod library;
mod service;

pub(crate) fn command() -> Command {
    forklaunch_command("init", "Initialize a new forklaunch project")
        .subcommand_required(true)
        .subcommand(application::command())
        .subcommand(library::command())
        .subcommand(service::command())
}

pub(crate) fn handler(matches: &ArgMatches) {
    println!("{:?}", matches);
}
