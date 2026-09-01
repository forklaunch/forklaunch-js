//! `forklaunch score` — Enterprise-Readiness Report Card for this workspace.
//!
//! Scores through the platform's analysis API, so the result is a real
//! five-rail agent-scored card and a shareable asset rather than a number that
//! disappears with the terminal scrollback.
//!
//! # Why it uploads
//!
//! `POST /analysis/repo` takes a `workspaceRoot` — a path on the orchestrator's
//! own disk. It cannot see a laptop. The only route from a local checkout is
//! `POST /analysis/zip`, so the workspace is packed and uploaded. What goes
//! into that archive is a privacy decision, handled in `workspace_archive`:
//! `.gitignore` is honoured, and `.git`/`node_modules` are dropped regardless.
//!
//! # What that costs
//!
//! Analysis is metered — a free tier per account, then credits — and returns a
//! job to poll rather than an answer. So this is a milestone action, not
//! something to run after every edit. `--offline` keeps the old behaviour for
//! the tight loop: deterministic checks only, no network, no auth, no cost, and
//! only the two rails static analysis can actually decide.

use std::path::Path;
use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use base64::Engine;
use clap::{Arg, ArgMatches, Command};
use serde_json::{Value, json};

use crate::{
    CliCommand,
    compliance::checks::run_local_checks,
    constants::{get_platform_ui_url, get_studio_orchestrator_api_url},
    core::{
        command::command,
        hmac::AuthMode,
        http_client::{get_with_auth, post_with_auth},
        report_card::{ReportCard, build_local_report_card, iso8601_now},
        validate::require_manifest,
        workspace_archive::pack_workspace,
    },
};

/// How long to wait for a job before giving up. Scoring runs several models;
/// minutes is normal, and a caller who hits this wants the job id rather than
/// a hang.
const POLL_TIMEOUT: Duration = Duration::from_secs(15 * 60);
const POLL_INTERVAL: Duration = Duration::from_secs(3);

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
            "Score this workspace's enterprise readiness and get a shareable report card.",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("Application root path (defaults to the current directory's manifest)"),
        )
        .arg(
            Arg::new("offline")
                .long("offline")
                .help(
                    "Score from deterministic checks only — no upload, no auth, no cost. Covers \
                     compliance and security; the other three rails need an agent and come back \
                     unassessed.",
                )
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("no_share")
                .long("no-share")
                .help("Skip minting the share link (the card is still scored and printed)")
                .action(clap::ArgAction::SetTrue),
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
        let json_out = matches.get_flag("json");
        let pretty = matches.get_flag("pretty");

        let (card_json, share_url) = if matches.get_flag("offline") {
            (offline_card(&app_root, &manifest.app_name, &manifest.modules_path)?, None)
        } else {
            score_via_api(
                &app_root,
                &manifest.app_name,
                !matches.get_flag("no_share"),
                json_out,
            )?
        };

        if json_out {
            let serialized = if pretty {
                serde_json::to_string_pretty(&card_json)?
            } else {
                serde_json::to_string(&card_json)?
            };
            println!("{}", serialized);
        } else {
            print_summary(&card_json);
            if let Some(url) = &share_url {
                println!("  {}", bold(&format!("Report card: {url}")));
                println!();
            }
        }

        if let Some(min) = matches.get_one::<u32>("min_score") {
            let overall = card_json
                .get("overall")
                .and_then(Value::as_u64)
                .unwrap_or(0) as u32;
            if overall < *min {
                anyhow::bail!(
                    "readiness score {} is below the required minimum of {}",
                    overall,
                    min
                );
            }
        }

        Ok(())
    }
}

/// Deterministic-only card, built locally. No network, no auth, no cost.
fn offline_card(app_root: &Path, app_name: &str, modules_path: &str) -> Result<Value> {
    let modules_root = app_root.join(modules_path);
    let findings = run_local_checks(&modules_root)?;
    let module_count = std::fs::read_dir(&modules_root)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .count()
        })
        .unwrap_or(0);

    let card: ReportCard =
        build_local_report_card(app_name, module_count, &findings, iso8601_now());
    Ok(json!(card))
}

fn studio_url(path: &str) -> String {
    format!(
        "{}/studio-orchestrator/analysis{}",
        get_studio_orchestrator_api_url(),
        path
    )
}

/// Pack → upload → poll → (optionally) share.
fn score_via_api(
    app_root: &Path,
    app_name: &str,
    want_share: bool,
    quiet: bool,
) -> Result<(Value, Option<String>)> {
    let auth = AuthMode::detect();

    if !quiet {
        println!();
        println!("  {} packing workspace…", dim("→"));
    }
    let (archive, summary) = pack_workspace(app_root)?;
    if !quiet {
        println!(
            "  {} {} files, {:.1} MB{}",
            dim("→"),
            summary.files,
            summary.bytes as f64 / (1024.0 * 1024.0),
            if summary.skipped_large > 0 {
                format!(" ({} large file(s) skipped)", summary.skipped_large)
            } else {
                String::new()
            }
        );
    }

    let zip_base64 = base64::engine::general_purpose::STANDARD.encode(&archive);
    let body = json!({ "appId": app_name, "zipBase64": zip_base64 });

    if !quiet {
        println!("  {} uploading for analysis…", dim("→"));
    }
    let response = post_with_auth(&auth, &studio_url("/zip"), body)
        .context("could not reach the analysis API")?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().unwrap_or_default();
        return Err(api_error(status.as_u16(), &text));
    }

    let accepted: Value = response.json().context("analysis API returned no job id")?;
    let job_id = accepted
        .get("jobId")
        .and_then(Value::as_str)
        .context("analysis API returned no job id")?
        .to_string();

    let job = poll_job(&auth, &job_id, quiet)?;
    let card = job
        .get("reportCard")
        .cloned()
        .context("the analysis finished without producing a report card")?;

    let share_url = if want_share {
        mint_share(&auth, &job_id).unwrap_or(None)
    } else {
        None
    };

    Ok((card, share_url))
}

/// Poll until the job reaches a terminal state.
fn poll_job(auth: &AuthMode, job_id: &str, quiet: bool) -> Result<Value> {
    let started = Instant::now();
    let mut last_status = String::new();

    loop {
        if started.elapsed() > POLL_TIMEOUT {
            anyhow::bail!(
                "analysis did not finish within {} minutes. It may still complete — check the \
                 dashboard, or poll job {job_id} directly.",
                POLL_TIMEOUT.as_secs() / 60
            );
        }

        let response = get_with_auth(auth, &studio_url(&format!("/job/{job_id}")))
            .context("lost contact with the analysis API")?;
        let http_status = response.status();
        if !http_status.is_success() {
            let text = response.text().unwrap_or_default();
            return Err(api_error(http_status.as_u16(), &text));
        }

        let job: Value = response.json().context("could not read the job status")?;
        let status = job.get("status").and_then(Value::as_str).unwrap_or("");

        match status {
            "done" => return Ok(job),
            "error" => {
                let message = job
                    .get("error")
                    .and_then(Value::as_str)
                    .unwrap_or("the analysis failed without a reason");
                anyhow::bail!("analysis failed: {message}");
            }
            other => {
                if !quiet && other != last_status {
                    println!("  {} {other}…", dim("→"));
                    last_status = other.to_string();
                }
            }
        }

        std::thread::sleep(POLL_INTERVAL);
    }
}

/// Mint a revocable share link. Best-effort: a scored card the caller can see
/// is worth more than an error because the link step failed.
fn mint_share(auth: &AuthMode, job_id: &str) -> Result<Option<String>> {
    let response = post_with_auth(auth, &studio_url("/share"), json!({ "jobId": job_id }))?;
    if !response.status().is_success() {
        return Ok(None);
    }
    let body: Value = response.json()?;
    Ok(body
        .get("sharePath")
        .and_then(Value::as_str)
        .map(|path| format!("{}{}", get_platform_ui_url(), path)))
}

/// Turn the API's status codes into something a person can act on. The tiering
/// (anonymous → sign in → free tier → credits) is invisible from a raw 401/402.
fn api_error(status: u16, body: &str) -> anyhow::Error {
    match status {
        401 => anyhow::anyhow!(
            "not signed in. Run `forklaunch login`, or use `forklaunch score --offline` for the \
             deterministic checks without an account."
        ),
        402 => anyhow::anyhow!(
            "analysis credits exhausted for this account. Add credits, or use \
             `forklaunch score --offline` for the deterministic checks."
        ),
        413 => anyhow::anyhow!(
            "the workspace archive was rejected as too large. Exclude generated directories or \
             score a narrower path with --path."
        ),
        _ => anyhow::anyhow!("analysis API returned {status} — {body}"),
    }
}

/// Terminal rendering. Default output, because a wall of JSON is not an answer
/// to "how ready is this" — the checklist and the unmet items are.
fn print_summary(card: &Value) {
    let overall = card.get("overall").and_then(Value::as_u64).unwrap_or(0);
    println!();
    println!("  {}  {}/100", bold("Enterprise Readiness"), overall);
    if let Some(headline) = card.get("headline").and_then(Value::as_str) {
        println!("  {}", dim(headline));
    }
    println!();

    if let Some(dimensions) = card.get("dimensions").and_then(Value::as_object) {
        let mut keys: Vec<&String> = dimensions.keys().collect();
        keys.sort();
        for key in keys {
            let rail = &dimensions[key];
            let label = {
                let mut c = key.chars();
                match c.next() {
                    Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                    None => key.clone(),
                }
            };

            if rail.get("pending").and_then(Value::as_bool).unwrap_or(false) {
                println!("  {:<16} {}", label, dim("not assessed"));
                continue;
            }

            let score = rail.get("score").and_then(Value::as_u64).unwrap_or(0);
            println!("  {:<16} {}/100", label, score);

            if let Some(items) = rail.get("items").and_then(Value::as_array) {
                for item in items.iter().take(8) {
                    let met = item.get("status").and_then(Value::as_str) == Some("met");
                    let text = item.get("label").and_then(Value::as_str).unwrap_or("");
                    println!("      {} {}", if met { "+" } else { "-" }, text);
                }
            }
            if let Some(findings) = rail.get("findings").and_then(Value::as_array)
                && !findings.is_empty()
            {
                println!("      {}", dim(&format!("{} finding(s)", findings.len())));
            }
            println!();
        }
    }

    if let Some(caveat) = card.get("caveat").and_then(Value::as_str) {
        println!("  {}", dim(caveat));
        println!();
    }
}

fn bold(s: &str) -> String {
    format!("\x1b[1m{s}\x1b[0m")
}

fn dim(s: &str) -> String {
    format!("\x1b[2m{s}\x1b[0m")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auth_failures_explain_the_tier_rather_than_the_status_code() {
        // A raw 401/402 tells the caller nothing about the anonymous → signed-in
        // → free-tier → credits ladder, and both have an offline escape hatch
        // worth naming at the point of failure.
        let unauthorised = api_error(401, "{}").to_string();
        assert!(unauthorised.contains("forklaunch login"), "{unauthorised}");
        assert!(unauthorised.contains("--offline"), "{unauthorised}");

        let payment = api_error(402, "{}").to_string();
        assert!(payment.contains("credits"), "{payment}");
        assert!(payment.contains("--offline"), "{payment}");
    }

    #[test]
    fn an_unexpected_status_keeps_the_body_rather_than_swallowing_it() {
        let err = api_error(500, "boom").to_string();
        assert!(err.contains("500"), "{err}");
        assert!(err.contains("boom"), "{err}");
    }

    #[test]
    fn the_studio_path_matches_what_the_dashboard_calls() {
        // The client hits `${STUDIO_API_URL}/studio-orchestrator/analysis/...`;
        // a mismatch here 404s against a service that is up and healthy.
        assert!(studio_url("/zip").ends_with("/studio-orchestrator/analysis/zip"));
        assert!(studio_url("/share").ends_with("/studio-orchestrator/analysis/share"));
    }

    #[test]
    fn summary_renders_a_card_without_panicking_on_missing_fields() {
        // The API's response is untyped (`unknownSchema`), so the renderer has
        // to tolerate a card that omits anything.
        print_summary(&json!({}));
        print_summary(&json!({
            "overall": 72,
            "dimensions": { "security": { "score": 80, "items": [], "findings": [] } }
        }));
    }
}
