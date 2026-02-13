use std::fs::write;

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};

use super::{CliCommand, unwrap_id};
use crate::{
    constants::{
        ERROR_FAILED_TO_SEND_REQUEST, error_failed_to_write_file, get_platform_management_api_url,
    },
    core::command::command,
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
        // Upfront validation
        let _token = crate::core::validate::require_auth()?;

        use crate::core::http_client;

        let id = unwrap_id(matches)?;

        let output = format!("{}.env", id);
        let output = matches.get_one::<String>("output").unwrap_or(&output);

        let url = format!("{}/config/{}", get_platform_management_api_url(), id);

        let response = http_client::get(&url).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        match response.status() {
            reqwest::StatusCode::OK => {
                let content = response.text()?;
                write(output, content)
                    .with_context(|| error_failed_to_write_file(std::path::Path::new(output)))?;
                println!("Config pulled to {}", output);
            }
            _ => anyhow::bail!("Failed to pull config: {}", response.text()?),
        }

        Ok(())
    }
}
