use std::io::Write;

use anyhow::{Context, Result, bail};
use clap::{Arg, ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_SEND_REQUEST, get_platform_management_api_url},
    core::{command::command, http_client, validate::require_auth},
};

// ── Top-level command ─────────────────────────────────────────────────────────

#[derive(Debug)]
pub(crate) struct WorkerCommand {
    pause: ActionCommand,
    resume: ActionCommand,
    restart: ActionCommand,
}

impl WorkerCommand {
    pub(crate) fn new() -> Self {
        Self {
            pause: ActionCommand::new("pause", "Pause a running worker", "pause"),
            resume: ActionCommand::new("resume", "Resume a paused worker", "resume"),
            restart: ActionCommand::new(
                "restart",
                "Restart a worker (force a new deployment)",
                "restart",
            ),
        }
    }
}

impl CliCommand for WorkerCommand {
    fn command(&self) -> Command {
        command("worker", "Pause, resume, or restart a deployed worker")
            .subcommand_required(true)
            .subcommand(self.pause.command())
            .subcommand(self.resume.command())
            .subcommand(self.restart.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("pause", sub_matches)) => self.pause.handler(sub_matches),
            Some(("resume", sub_matches)) => self.resume.handler(sub_matches),
            Some(("restart", sub_matches)) => self.restart.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}

// ── Shared action sub-subcommand ─────────────────────────────────────────────
// pause/resume/restart are identical in shape — one worker id, one POST to a
// fixed sub-path, a plain-text success body — so one struct backs all three.

#[derive(Debug)]
struct ActionCommand {
    name: &'static str,
    about: &'static str,
    path_segment: &'static str,
}

impl ActionCommand {
    fn new(name: &'static str, about: &'static str, path_segment: &'static str) -> Self {
        Self {
            name,
            about,
            path_segment,
        }
    }
}

impl CliCommand for ActionCommand {
    fn command(&self) -> Command {
        command(self.name, self.about).arg(
            Arg::new("id")
                .required(true)
                .help("The worker ID to act on"),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let _token = require_auth()?;
        let worker_id = matches
            .get_one::<String>("id")
            .context("worker id is required")?;

        let url = format!(
            "{}/workers/{}/{}",
            get_platform_management_api_url(),
            worker_id,
            self.path_segment
        );
        let response = http_client::post(&url, serde_json::json!({}))
            .with_context(|| ERROR_FAILED_TO_SEND_REQUEST)?;

        if response.status().as_u16() == 404 {
            bail!("Worker '{}' not found.", worker_id);
        }
        if !response.status().is_success() {
            bail!(
                "Failed to {} worker: {}",
                self.name,
                response.text().unwrap_or_default()
            );
        }

        let body = response.text().unwrap_or_default();
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
        write!(stdout, "  Done")?;
        stdout.reset()?;
        if body.trim().is_empty() {
            writeln!(stdout, "  worker {} {}d", worker_id, self.name)?;
        } else {
            writeln!(stdout, "  {}", body)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn worker_cmd() -> Command {
        WorkerCommand::new().command().version("0.0.0-test")
    }

    #[test]
    fn command_definition_is_valid() {
        worker_cmd().debug_assert();
    }

    #[test]
    fn requires_a_subcommand() {
        assert!(worker_cmd().try_get_matches_from(["worker"]).is_err());
    }

    #[test]
    fn pause_requires_worker_id() {
        assert!(worker_cmd().try_get_matches_from(["worker", "pause"]).is_err());
        assert!(
            worker_cmd()
                .try_get_matches_from(["worker", "pause", "worker-1"])
                .is_ok()
        );
    }

    #[test]
    fn resume_requires_worker_id() {
        assert!(
            worker_cmd()
                .try_get_matches_from(["worker", "resume", "worker-1"])
                .is_ok()
        );
    }

    #[test]
    fn restart_requires_worker_id() {
        assert!(
            worker_cmd()
                .try_get_matches_from(["worker", "restart", "worker-1"])
                .is_ok()
        );
    }
}
