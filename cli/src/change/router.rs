use clap::Command;

use crate::{core::command::command, CliCommand};

#[derive(Debug)]
pub(super) struct RouterCommand;

impl RouterCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for RouterCommand {
    fn command(&self) -> Command {
        command("router", "Change a forklaunch router")
    }

    fn handler(&self, matches: &clap::ArgMatches) -> anyhow::Result<()> {
        todo!()
    }
}
