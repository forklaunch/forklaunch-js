use anyhow::Result;
use clap::{command, ArgMatches, Command};
use init::InitCommand;

mod config;
mod constants;
mod depcheck;
mod init;
mod login;
mod logout;
mod version;
mod whoami;

mod utils;

pub(crate) trait CliCommand {
    fn command(&self) -> Command;
    fn handler(&self, matches: &ArgMatches) -> Result<()>;
}

fn main() -> anyhow::Result<()> {
    let init = InitCommand::new();
    let matches = command!()
        .propagate_version(true)
        .arg_required_else_help(true)
        .subcommand_required(true)
        .subcommand(init.command())
        .subcommand(depcheck::command())
        .subcommand(config::command())
        .subcommand(login::command())
        .subcommand(logout::command())
        .subcommand(whoami::command())
        .subcommand(version::command())
        .get_matches();

    match matches.subcommand() {
        Some(("init", sub_matches)) => init.handler(sub_matches),
        Some(("depcheck", sub_matches)) => depcheck::handler(sub_matches),
        Some(("config", sub_matches)) => config::handler(sub_matches),
        Some(("login", sub_matches)) => login::handler(sub_matches),
        Some(("logout", sub_matches)) => logout::handler(sub_matches),
        Some(("whoami", sub_matches)) => whoami::handler(sub_matches),
        Some(("version", sub_matches)) => version::handler(sub_matches),
        _ => unreachable!(),
    }
}
