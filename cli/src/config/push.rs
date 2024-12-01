use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};

use crate::{constants::ERROR_FAILED_TO_SEND_REQUEST, utils::get_token};

use super::{forklaunch_command, unwrap_id};

pub(crate) fn command() -> Command {
    forklaunch_command("push", "Push a configuration to the forklaunch platform")
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

pub(crate) fn handler(matches: &ArgMatches) -> Result<()> {
    let id = unwrap_id(matches)?;

    let input = format!("{}.env", id);
    let input = matches.get_one::<String>("input").unwrap_or(&input);

    // TODO: remove and pass token from parent
    let token = get_token()?;

    let url = format!("https://api.forklaunch.dev/config/{}", id);
    let client = reqwest::blocking::Client::new();
    let request = client
        .post(url)
        .bearer_auth(token)
        .body(std::fs::read(input)?);
    let response = request
        .send()
        .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

    match response.status() {
        reqwest::StatusCode::OK => println!("Config pushed to {}", id),
        _ => anyhow::bail!("Failed to push config: {}", response.text()?),
    }

    Ok(())
}
