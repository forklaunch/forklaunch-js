use crate::{
    constants::{error_failed_to_write_file, ERROR_FAILED_TO_SEND_REQUEST, PROD_API_URL},
    utils::{forklaunch_command, get_token},
};
use anyhow::{bail, Context, Result};
use clap::{Arg, ArgMatches, Command};
use reqwest::{blocking::Client, StatusCode};
use std::{fs::write, path::Path};

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

    // TODO: remove and pass token from parent
    let token = get_token()?;

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
