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
    Ok(
        std::fs::read_to_string(format!("{}/.forklaunch/token", std::env::var("HOME")?))?
            .trim()
            .to_string(),
    )
}
