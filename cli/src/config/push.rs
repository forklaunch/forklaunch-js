use std::fs::read;

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};

use crate::{
    constants::{ERROR_FAILED_TO_SEND_REQUEST, PROD_API_URL},
    core::command::command,
    core::token::get_token,
};

use super::{unwrap_id, CliCommand};

#[derive(Debug)]
pub(crate) struct PushCommand;

impl PushCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for PushCommand {
    fn command(&self) -> Command {
        command("push", "Push a configuration to the forklaunch platform")
            .arg(
                Arg::new("id")
                    .required(true)
                    .help("Retrieves a configuration by a specific identifier"),
            )
            .arg(
                Arg::new("input")
                    .short('i')
                    .long("input")
                    .help("Path to the configuration file to push")
                    .required(false),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        // TODO: remove and pass token from parent
        let token = get_token()?;

        let id = unwrap_id(matches)?;

        let input = format!("{}.env", id);
        let input = matches.get_one::<String>("input").unwrap_or(&input);

        let url = format!("{}/config/{}", PROD_API_URL, id);
        let client = reqwest::blocking::Client::new();
        // TODO: fix this, this doesn't seem right
        let request = client.post(url).bearer_auth(token).body(read(input)?);
        let response = request
            .send()
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        match response.status() {
            reqwest::StatusCode::OK => println!("Config pushed to {}", id),
            _ => anyhow::bail!("Failed to push config: {}", response.text()?),
        }

        Ok(())
    }
}
