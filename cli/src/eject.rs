use anyhow::Result;
use clap::{Arg, ArgMatches, Command};

use crate::{core::command::command, CliCommand};

// TODO: add injected token into struct
#[derive(Debug)]
pub(crate) struct EjectCommand {}

impl EjectCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for EjectCommand {
    fn command(&self) -> Command {
        command("eject", "Eject a forklaunch project")
            .alias("ej")
            .arg(Arg::new("base_path").short('b'))
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        // if in application, prompt for base path
        // look at manifest to see type of project
        // load source files from package into memory
        // perform replacements

        // drop in schemas from zod definitins -- change import to core/registrations

        // drop in interfaces and types from base interface package

        // transform dto imports -- import them from the interface itself

        // remove generic args -- import enums from enum paths and apply directly to the interfaces

        // maybe remove strings around entity names

        // get rid of casts (either 'as Dto[..]' or 'as Entity[..]')

        // update bootstrapper code accordingly (get rid of generics in types, get rid of all arguments after SchemaValidator)
    }
}
