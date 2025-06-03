use anyhow::Result;
use change::ChangeCommand;
use clap::{ArgMatches, Command, command};
use config::ConfigCommand;
use delete::DeleteCommand;
use depcheck::DepcheckCommand;
use eject::EjectCommand;
use init::InitCommand;
use login::LoginCommand;
use logout::LogoutCommand;
use version::VersionCommand;
use whoami::WhoAmICommand;

mod change;
mod config;
mod constants;
mod core;
mod delete;
mod depcheck;
mod eject;
mod init;
mod login;
mod logout;
mod prompt;
mod version;
mod whoami;

pub(crate) trait CliCommand {
    fn command(&self) -> Command;
    fn handler(&self, matches: &ArgMatches) -> Result<()>;
}

fn main() -> Result<()> {
    // inject token into init, config
    let init = InitCommand::new();
    let change = ChangeCommand::new();
    let config = ConfigCommand::new();
    let delete = DeleteCommand::new();
    let depcheck = DepcheckCommand::new();
    let eject = EjectCommand::new();
    let login = LoginCommand::new();
    let logout = LogoutCommand::new();
    let whoami = WhoAmICommand::new();
    let version = VersionCommand::new();

    let matches = command!()
        .propagate_version(true)
        .arg_required_else_help(true)
        .subcommand_required(true)
        .subcommand(init.command())
        .subcommand(delete.command())
        .subcommand(change.command())
        .subcommand(eject.command())
        .subcommand(depcheck.command())
        .subcommand(config.command())
        .subcommand(login.command())
        .subcommand(logout.command())
        .subcommand(whoami.command())
        .subcommand(version.command())
        .get_matches();

    let result = match matches.subcommand() {
        Some(("init", sub_matches)) => init.handler(sub_matches),
        Some(("change", sub_matches)) => change.handler(sub_matches),
        Some(("config", sub_matches)) => config.handler(sub_matches),
        Some(("delete", sub_matches)) => delete.handler(sub_matches),
        Some(("depcheck", sub_matches)) => depcheck.handler(sub_matches),
        Some(("eject", sub_matches)) => eject.handler(sub_matches),
        Some(("login", sub_matches)) => login.handler(sub_matches),
        Some(("logout", sub_matches)) => logout.handler(sub_matches),
        Some(("whoami", sub_matches)) => whoami.handler(sub_matches),
        Some(("version", sub_matches)) => version.handler(sub_matches),
        _ => unreachable!(),
    };

    match result {
        Ok(_) => result,
        // TODO: make sure that the error text returns in red color
        Err(error) => Err(error),
    }
}
