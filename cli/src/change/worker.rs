use clap::Command;

use crate::{core::command::command, CliCommand};

#[derive(Debug)]
pub(super) struct WorkerCommand;

impl WorkerCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for WorkerCommand {
    fn command(&self) -> Command {
        command("worker", "Change a forklaunch worker")
    }

    fn handler(&self, matches: &clap::ArgMatches) -> anyhow::Result<()> {
        todo!()
    }
}
