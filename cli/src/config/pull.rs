use clap::{Arg, ArgMatches, Command};

use crate::utils::{forklaunch_command, get_token};

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

pub(crate) fn handler(matches: &ArgMatches) -> anyhow::Result<()> {
    let id = unwrap_id(matches)?;

    let output = format!("{}.env", id);
    let output = matches.get_one::<String>("output").unwrap_or(&output);

    let token = get_token()?;

    let url = format!("https://api.forklaunch.dev/config/{}", id);
    let client = reqwest::blocking::Client::new();
    let request = client.get(url).bearer_auth(token);
    let response = request.send()?;

    match response.status() {
        reqwest::StatusCode::OK => println!("Config received, saving to {}", output),
        _ => anyhow::bail!("Failed to pull config: {}", response.text()?),
    }

    let bytes = response.bytes()?;
    std::fs::write(output, bytes)?;

    Ok(())
}
