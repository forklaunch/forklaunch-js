use clap::{Arg, ArgMatches, Command};

use super::forklaunch_command;

pub(crate) fn command() -> Command {
    forklaunch_command("service", "Initialize a new service")
        .alias("svc")
        .alias("project")
        .alias("proj")
        .arg(
            Arg::new("name")
                .required(true)
                .help("The name of the application"),
        )
}

pub(crate) fn handler(matches: &ArgMatches) {
    println!("{:?}", matches);
}
