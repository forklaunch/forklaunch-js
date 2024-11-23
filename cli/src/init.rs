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

pub(crate) fn handler(matches: &ArgMatches) -> anyhow::Result<()> {
    match matches.subcommand() {
        Some(("application", sub_matches)) => application::handler(sub_matches),
        // Some(("library", sub_matches)) => library::handler(sub_matches).unwrap(),
        // Some(("service", sub_matches)) => service::handler(sub_matches).unwrap(),
        _ => unreachable!(),
    }
}
