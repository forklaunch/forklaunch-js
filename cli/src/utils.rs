use std::path::Path;

use anyhow::bail;
use clap::Command;

pub(crate) fn forklaunch_command(
    name: impl Into<&'static str>,
    about: impl Into<&'static str>,
) -> Command {
    Command::new(name.into())
        .propagate_version(true)
        .arg_required_else_help(true)
        .about(about.into())
}

pub(crate) fn get_token() -> anyhow::Result<String> {
    let home_path = format!("{}/.forklaunch/token", std::env::var("HOME")?);

    if !Path::new(&home_path).exists() {
        bail!("No token found. Please run `forklaunch login` to get a token.");
    }

    Ok(std::fs::read_to_string(&home_path)?.trim().to_string())
}
