use clap::Command;

pub(crate) fn command(name: impl Into<&'static str>, about: impl Into<&'static str>) -> Command {
    Command::new(name.into())
        .propagate_version(true)
        .about(about.into())
}
