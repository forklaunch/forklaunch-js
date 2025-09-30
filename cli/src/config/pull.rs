use std::{fs::write, path::Path};

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use reqwest::{StatusCode, blocking::Client};

use super::{CliCommand, unwrap_id};
use crate::{
    constants::{ERROR_FAILED_TO_SEND_REQUEST, PROD_API_URL, error_failed_to_write_file},
    core::{command::command, token::get_token},
};

#[derive(Debug)]
pub(crate) struct PullCommand;

impl PullCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for PullCommand {
    fn command(&self) -> Command {
        command(
            "pull",
            "Retrieves a configuration from the forklaunch platform",
        )
        .arg(
            Arg::new("id")
                .required(true)
                .help("The identifier of the configuration to retrieve"),
        )
        .arg(
            Arg::new("output")
                .short('o')
                .long("output")
                .help("Path to the configuration file to push")
                .required(false),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        // TODO: remove and pass token from parent
        let token = get_token()?;

        let id = unwrap_id(matches)?;

        let output = format!("{}.env", id);
        let output = matches.get_one::<String>("output").unwrap_or(&output);

        let url = format!("{}/config/{}", PROD_API_URL, id);
        let client = Client::new();
        let request = client.get(url).bearer_auth(token);
        let response = request
            .send()
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        match response.status() {
            StatusCode::OK => println!("Config received, saving to {}", output),
            _ => bail!("Failed to pull config: {}", response.text()?),
        }

        let bytes = response.bytes()?;
        write(output, bytes).with_context(|| error_failed_to_write_file(&Path::new(output)))?;

        Ok(())
    }
}
