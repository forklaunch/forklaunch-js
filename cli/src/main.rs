use clap::{command, Command};

mod config;
mod depcheck;
mod init;
mod login;
mod logout;
mod version;
mod whoami;

mod utils;

const LATEST_CLI_VERSION: &str = "0.1.0";

fn main() -> anyhow::Result<()> {
    let matches = command!()
        .propagate_version(true)
        .arg_required_else_help(true)
        .subcommand_required(true)
        .subcommand(init::command())
        .subcommand(depcheck::command())
        .subcommand(config::command())
        .subcommand(Command::new("login").about("Login to the forklaunch platform"))
        .subcommand(Command::new("logout").about("Logout from the forklaunch platform"))
        .subcommand(Command::new("whoami").about("Get the current user"))
        .subcommand(Command::new("version").about("Get the current version of forklaunch"))
        .get_matches();

    match matches.subcommand() {
        Some(("init", sub_matches)) => init::handler(sub_matches),
        _ => unreachable!(),
    }
}
