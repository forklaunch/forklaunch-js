use std::fs::read;

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};

use super::{CliCommand, unwrap_id};
use crate::{
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_platform_management_api_url},
    core::command::command,
};

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
        use crate::core::http_client;

        let id = unwrap_id(matches)?;

        let input = format!("{}.env", id);
        let input = matches.get_one::<String>("input").unwrap_or(&input);

        let url = format!("{}/config/{}", get_platform_management_api_url(), id);

        // Read file content and wrap in JSON value
        let body_bytes = read(input)?;
        let body_str = String::from_utf8_lossy(&body_bytes).to_string();
        let body_value = serde_json::json!(body_str);

        let response =
            http_client::post(&url, body_value).with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        match response.status() {
            reqwest::StatusCode::OK => println!("Config pushed to {}", id),
            _ => anyhow::bail!("Failed to push config: {}", response.text()?),
        }

        Ok(())
    }
}
