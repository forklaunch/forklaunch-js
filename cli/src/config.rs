use clap::{ArgMatches, Command};

use crate::utils::forklaunch_command;

mod pull;
mod push;

pub(crate) fn command() -> Command {
    forklaunch_command("config", "Get or set application configuration")
        .subcommand(pull::command())
        .subcommand(push::command())
}

pub(crate) fn handler(matches: &ArgMatches) {
    match matches.subcommand() {
        Some(("pull", matches)) => pull::handler(matches).unwrap(),
        Some(("push", matches)) => push::handler(matches).unwrap(),
        _ => unreachable!(),
    }
}

pub(crate) fn unwrap_id(matches: &ArgMatches) -> anyhow::Result<&String> {
    let wrapped_id = matches.get_one::<String>("id");
    Ok(match wrapped_id {
        None => anyhow::bail!("No id provided"),
        Some(id) => id,
    })
}
