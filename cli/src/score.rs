//! `forklaunch score` — Enterprise-Readiness Report Card from deterministic checks.
//!
//! Deliberately its own top-level command rather than a flag on `analyze`.
//! `analyze` answers "what is in this workspace" and emits a structural
//! snapshot; this answers "how ready is it" and emits a scored card. Two
//! questions, two commands — a flag would have hidden the second behind the
//! first, and "score my app" is the thing people actually want to type.

use anyhow::Result;
use clap::{Arg, ArgMatches, Command};
use serde_json::json;

use crate::{
    CliCommand,
    compliance::checks::run_local_checks,
    core::{
        command::command,
        report_card::{ReportCard, build_local_report_card},
        validate::require_manifest,
    },
};

#[derive(Debug)]
pub(crate) struct ScoreCommand;

impl ScoreCommand {
    pub(crate) fn new() -> Self {
        Self
    }
}

impl CliCommand for ScoreCommand {
    fn command(&self) -> Command {
        command(
            "score",
            "Score this workspace's enterprise readiness from deterministic checks. Read-only, offline.",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("Application root path (defaults to the current directory's manifest)"),
        )
        .arg(
            Arg::new("json")
                .long("json")
                .help("Emit the raw report card as JSON instead of a terminal summary")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("pretty")
                .long("pretty")
                .help("Pretty-print the JSON output")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("min_score")
                .long("min-score")
                .help("Exit non-zero if the overall score is below this (0-100). For CI gating.")
                .value_parser(clap::value_parser!(u32).range(0..=100)),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let (app_root, manifest) = require_manifest(matches)?;
        let modules_root = app_root.join(&manifest.modules_path);
        let findings = run_local_checks(&modules_root)?;

        // Count what run_local_checks actually walked, not what the manifest
        // lists -- the two differ, and a headline that names a number the scan
        // did not cover is a small lie in a report about correctness.
        let module_count = std::fs::read_dir(&modules_root)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .count()
            })
            .unwrap_or(0);
        let card = build_local_report_card(
            &manifest.app_name,
            module_count,
            &findings,
            crate::core::report_card::iso8601_now(),
        );

        if matches.get_flag("json") {
            let serialized = if matches.get_flag("pretty") {
                serde_json::to_string_pretty(&json!(card))?
            } else {
                serde_json::to_string(&json!(card))?
            };
            println!("{}", serialized);
        } else {
            print_summary(&card);
        }

        if let Some(min) = matches.get_one::<u32>("min_score")
            && card.overall < *min
        {
            anyhow::bail!(
                "readiness score {} is below the required minimum of {}",
                card.overall,
                min
            );
        }

        Ok(())
    }
}

/// Terminal rendering. Default output, because a wall of JSON is not an answer
/// to "how ready is this" — the checklist and the unmet items are.
fn print_summary(card: &ReportCard) {
    println!();
    println!("  {}  {}/100", bold("Enterprise Readiness"), card.overall);
    println!("  {}", dim(&card.headline));
    println!();

    for (key, dim_) in &card.dimensions {
        let label = {
            let mut c = key.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => key.clone(),
            }
        };

        if dim_.pending.unwrap_or(false) {
            println!("  {:<16} {}", label, dim("not assessed"));
            continue;
        }

        println!("  {:<16} {}/100", label, dim_.score);
        for item in &dim_.items {
            let mark = if item.status == "met" { "+" } else { "-" };
            println!("      {} {}", mark, item.label);
        }
        if !dim_.findings.is_empty() {
            println!(
                "      {}",
                dim(&format!("{} finding(s)", dim_.findings.len()))
            );
        }
        println!();
    }

    println!("  {}", dim(&card.caveat));
    println!();
    println!(
        "  {}",
        dim("Run with --json for the full card, including every finding and its fix.")
    );
    println!();
}

fn bold(s: &str) -> String {
    format!("\x1b[1m{s}\x1b[0m")
}

fn dim(s: &str) -> String {
    format!("\x1b[2m{s}\x1b[0m")
}
