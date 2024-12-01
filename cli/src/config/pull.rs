use crate::utils::{forklaunch_command, get_token};
use anyhow::{bail, Result};
use clap::{Arg, ArgMatches, Command};
use reqwest::{blocking::Client, StatusCode};
use std::fs::write;

use super::unwrap_id;

pub(crate) fn command() -> Command {
    forklaunch_command(
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

pub(crate) fn handler(matches: &ArgMatches) -> Result<()> {
    let id = unwrap_id(matches)?;

    let output = format!("{}.env", id);
    let output = matches.get_one::<String>("output").unwrap_or(&output);

    let token = get_token()?;

    let url = format!("https://api.forklaunch.dev/config/{}", id);
    let client = Client::new();
    let request = client.get(url).bearer_auth(token);
    let response = request.send()?;

    match response.status() {
        StatusCode::OK => println!("Config received, saving to {}", output),
        _ => bail!("Failed to pull config: {}", response.text()?),
    }

    let bytes = response.bytes()?;
    write(output, bytes)?;

    Ok(())
}