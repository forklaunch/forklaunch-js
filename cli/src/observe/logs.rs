use std::{
    collections::{HashSet, VecDeque},
    io::Write,
    thread::sleep,
    time::Duration,
};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use clap::{Arg, ArgAction, ArgMatches, Command};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::get_observability_api_url,
    core::{
        command::command,
        hmac::AuthMode,
        http_client::get_with_auth,
        validate::{require_integration, require_manifest},
    },
};

/// How often `--follow` asks the API for logs newer than the last one printed.
const POLL_INTERVAL: Duration = Duration::from_secs(2);

/// The API resolves `since` at second granularity, so each poll deliberately
/// overlaps the previous window by a second rather than risk dropping a line
/// that landed in the same second as the newest one already printed. The
/// overlap is absorbed by de-duplicating on log id.
const POLL_OVERLAP_SECONDS: i64 = 1;

/// Upper bound on remembered log ids. Large enough that a poll window's worth
/// of overlap is always covered, small enough to stay flat over a long tail.
const SEEN_IDS_CAPACITY: usize = 5_000;

#[derive(Debug)]
pub(super) struct LogsCommand;

impl LogsCommand {
    pub(super) fn new() -> Self {
        Self
    }
}

impl CliCommand for LogsCommand {
    fn command(&self) -> Command {
        command("logs", "Query or live-tail logs for a ForkLaunch application")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The application path"),
            )
            .arg(
                Arg::new("environment")
                    .short('e')
                    .long("environment")
                    .required(true)
                    .help("Environment to inspect (for example: dev, staging, production)"),
            )
            .arg(
                Arg::new("service")
                    .short('s')
                    .long("service")
                    .help(
                        "Filter to a single service or worker by name (a bare \
                         project name matches both)",
                    ),
            )
            .arg(
                Arg::new("level")
                    .long("level")
                    .help("Filter by log level (error, warn, info, debug)"),
            )
            .arg(
                Arg::new("since")
                    .long("since")
                    .help("Return logs newer than this ISO timestamp"),
            )
            .arg(
                Arg::new("limit")
                    .long("limit")
                    .default_value("100")
                    .value_parser(clap::value_parser!(u32))
                    .help("Maximum number of log lines to fetch"),
            )
            .arg(
                Arg::new("follow")
                    .short('f')
                    .long("follow")
                    .help("Stream new logs as they arrive (live-tail)")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("json")
                    .long("json")
                    .help("Output raw JSON instead of formatted terminal output")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let (_app_root, manifest) = require_manifest(matches)?;
        let application_id = require_integration(&manifest)?;
        let environment = matches
            .get_one::<String>("environment")
            .context("--environment is required")?
            .to_string();
        let service = matches.get_one::<String>("service").cloned();
        let level = matches.get_one::<String>("level").cloned();
        let since = matches.get_one::<String>("since").cloned();
        let limit: u32 = matches.get_one::<u32>("limit").copied().unwrap_or(100);
        let follow = matches.get_flag("follow");
        let json_output = matches.get_flag("json");

        if follow {
            stream_logs(
                &application_id,
                &environment,
                service.as_deref(),
                level.as_deref(),
                since.as_deref(),
                limit,
                json_output,
            )
        } else {
            query_logs(
                &application_id,
                &environment,
                service.as_deref(),
                level.as_deref(),
                since.as_deref(),
                limit,
                json_output,
            )
        }
    }
}

// ── HTTP query (no --follow) ──────────────────────────────────────────────────

fn query_logs(
    application_id: &str,
    environment: &str,
    service: Option<&str>,
    level: Option<&str>,
    since: Option<&str>,
    limit: u32,
    json_output: bool,
) -> Result<()> {
    let response = fetch_logs(application_id, environment, service, level, since, limit)?;

    if json_output {
        println!("{}", serde_json::to_string_pretty(&response)?);
    } else {
        print_logs(&response.logs)?;
    }

    Ok(())
}

fn fetch_logs(
    application_id: &str,
    environment: &str,
    service: Option<&str>,
    level: Option<&str>,
    since: Option<&str>,
    limit: u32,
) -> Result<LogsResponse> {
    let api_url = get_observability_api_url();
    let mut url = format!(
        "{}/applications/{}/logs?environment={}&limit={}&direction=backward",
        api_url,
        application_id,
        urlencoding::encode(environment),
        limit
    );
    if let Some(svc) = service {
        url.push_str(&format!("&service={}", urlencoding::encode(svc)));
    }
    if let Some(lvl) = level {
        url.push_str(&format!("&level={}", urlencoding::encode(lvl)));
    }
    if let Some(s) = since {
        url.push_str(&format!("&since={}", urlencoding::encode(s)));
    }

    let auth_mode = AuthMode::detect();
    let response =
        get_with_auth(&auth_mode, &url).with_context(|| "Failed to reach observability API")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .unwrap_or_else(|_| "unknown error".to_string());
        anyhow::bail!("Observability API returned {} — {}", status, body);
    }

    response
        .json()
        .with_context(|| "Failed to parse logs response")
}

// ── Live tail (--follow) ──────────────────────────────────────────────────────

/// Live-tail by polling the same endpoint the one-shot query uses, asking each
/// time for logs newer than the newest one already printed.
///
/// This previously subscribed to a WebSocket channel, which could not work:
/// the CLI derived the socket URL from the HTTP API base, but the monitoring
/// socket listens on its own port (WS_PORT), and nothing on the server ever
/// published to the log channels it subscribed to. Polling reuses the request
/// path and auth that already work, so it needs no additional infrastructure.
fn stream_logs(
    application_id: &str,
    environment: &str,
    service: Option<&str>,
    level: Option<&str>,
    since: Option<&str>,
    limit: u32,
    json_output: bool,
) -> Result<()> {
    let mut seen = SeenLogIds::new(SEEN_IDS_CAPACITY);

    // Seed from recent history so the tail opens with context, oldest first.
    let initial = fetch_logs(application_id, environment, service, level, since, limit)?;
    let mut entries = initial.logs;
    sort_ascending(&mut entries);
    entries.retain(|entry| seen.insert(entry.id.clone()));

    let mut cursor = entries
        .last()
        .and_then(|entry| parse_timestamp(&entry.timestamp))
        .unwrap_or_else(Utc::now);

    if json_output {
        print_logs_json(&entries)?;
    } else {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        print_logs(&entries)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
        writeln!(
            stdout,
            "Streaming logs for {} ({})…  Ctrl+C to stop",
            application_id, environment
        )?;
        stdout.reset()?;
    }

    loop {
        sleep(POLL_INTERVAL);

        let window_start = cursor - chrono::Duration::seconds(POLL_OVERLAP_SECONDS);
        let page = fetch_logs(
            application_id,
            environment,
            service,
            level,
            Some(&format_timestamp(window_start)),
            limit,
        )?;

        let mut fresh = page.logs;
        sort_ascending(&mut fresh);
        fresh.retain(|entry| seen.insert(entry.id.clone()));

        if fresh.is_empty() {
            continue;
        }

        if let Some(newest) = fresh
            .last()
            .and_then(|entry| parse_timestamp(&entry.timestamp))
            .filter(|newest| *newest > cursor)
        {
            cursor = newest;
        }

        if json_output {
            print_logs_json(&fresh)?;
        } else {
            print_logs(&fresh)?;
        }
    }
}

/// Remembers recently printed log ids so the deliberate overlap between poll
/// windows never prints a line twice. Bounded, evicting oldest first.
struct SeenLogIds {
    ids: HashSet<String>,
    order: VecDeque<String>,
    capacity: usize,
}

impl SeenLogIds {
    fn new(capacity: usize) -> Self {
        Self {
            ids: HashSet::new(),
            order: VecDeque::new(),
            capacity,
        }
    }

    /// Records an id, returning true if it had not been seen before.
    fn insert(&mut self, id: String) -> bool {
        if !self.ids.insert(id.clone()) {
            return false;
        }
        self.order.push_back(id);
        while self.order.len() > self.capacity {
            if let Some(evicted) = self.order.pop_front() {
                self.ids.remove(&evicted);
            }
        }
        true
    }
}

/// The API returns newest-first for `direction=backward`; a tail reads
/// oldest-first so new lines append at the bottom.
fn sort_ascending(entries: &mut [LogEntry]) {
    entries.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
}

fn parse_timestamp(timestamp: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(timestamp)
        .ok()
        .map(|parsed| parsed.with_timezone(&Utc))
}

fn format_timestamp(timestamp: DateTime<Utc>) -> String {
    timestamp.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn print_logs_json(entries: &[LogEntry]) -> Result<()> {
    for entry in entries {
        println!("{}", serde_json::to_string(entry)?);
    }
    Ok(())
}

// ── Display ───────────────────────────────────────────────────────────────────

fn print_logs(logs: &[LogEntry]) -> Result<()> {
    let mut stdout = StandardStream::stdout(ColorChoice::Always);

    for entry in logs {
        let level = entry.level.as_deref().unwrap_or("info");
        let color = level_color(level);

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::White)))?;
        let ts_display = entry.timestamp.get(..19).unwrap_or(&entry.timestamp).replace('T', " ");
        write!(stdout, "{} ", ts_display)?;

        stdout.set_color(ColorSpec::new().set_fg(Some(color)).set_bold(true))?;
        write!(stdout, "{:<5} ", level.to_uppercase())?;

        stdout.reset()?;
        writeln!(stdout, "{}", entry.message)?;
    }

    Ok(())
}

fn level_color(level: &str) -> Color {
    match level.to_lowercase().as_str() {
        "error" => Color::Red,
        "warn" | "warning" => Color::Yellow,
        "info" => Color::Green,
        "debug" => Color::Cyan,
        _ => Color::White,
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogEntry {
    id: String,
    timestamp: String,
    level: Option<String>,
    message: String,
    #[serde(default)]
    labels: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogsResponse {
    logs: Vec<LogEntry>,
    #[serde(default)]
    available: bool,
    #[serde(default)]
    has_more: Option<bool>,
    #[serde(default)]
    next_cursor: Option<String>,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(id: &str, timestamp: &str) -> LogEntry {
        LogEntry {
            id: id.to_string(),
            timestamp: timestamp.to_string(),
            level: Some("info".to_string()),
            message: format!("message {}", id),
            labels: serde_json::Value::Null,
        }
    }

    #[test]
    fn seen_ids_reports_only_first_occurrence() {
        let mut seen = SeenLogIds::new(10);
        assert!(seen.insert("a".to_string()));
        assert!(!seen.insert("a".to_string()));
        assert!(seen.insert("b".to_string()));
    }

    #[test]
    fn seen_ids_evicts_oldest_beyond_capacity() {
        let mut seen = SeenLogIds::new(2);
        seen.insert("a".to_string());
        seen.insert("b".to_string());
        seen.insert("c".to_string());

        // "a" was evicted, so it is no longer recognised; "c" still is.
        assert!(seen.insert("a".to_string()));
        assert!(!seen.insert("c".to_string()));
    }

    #[test]
    fn seen_ids_stays_bounded() {
        let mut seen = SeenLogIds::new(3);
        for i in 0..100 {
            seen.insert(format!("id-{}", i));
        }
        assert_eq!(seen.ids.len(), 3);
        assert_eq!(seen.order.len(), 3);
    }

    #[test]
    fn overlapping_pages_do_not_reprint_lines() {
        // The poll window deliberately overlaps by a second; the overlap must
        // be absorbed rather than printed twice.
        let mut seen = SeenLogIds::new(100);
        let mut first = vec![
            entry("1", "2026-07-28T10:00:00.000Z"),
            entry("2", "2026-07-28T10:00:01.000Z"),
        ];
        first.retain(|e| seen.insert(e.id.clone()));
        assert_eq!(first.len(), 2);

        let mut second = vec![
            entry("2", "2026-07-28T10:00:01.000Z"),
            entry("3", "2026-07-28T10:00:02.000Z"),
        ];
        second.retain(|e| seen.insert(e.id.clone()));
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].id, "3");
    }

    #[test]
    fn sorts_oldest_first_so_a_tail_appends_downward() {
        // The API returns newest-first for direction=backward.
        let mut entries = vec![
            entry("newest", "2026-07-28T10:00:02.000Z"),
            entry("oldest", "2026-07-28T10:00:00.000Z"),
            entry("middle", "2026-07-28T10:00:01.000Z"),
        ];
        sort_ascending(&mut entries);
        let ids: Vec<&str> = entries.iter().map(|e| e.id.as_str()).collect();
        assert_eq!(ids, vec!["oldest", "middle", "newest"]);
    }

    #[test]
    fn parses_and_formats_round_trip() {
        let parsed = parse_timestamp("2026-07-28T10:00:00.000Z").expect("should parse");
        assert_eq!(format_timestamp(parsed), "2026-07-28T10:00:00.000Z");
    }

    #[test]
    fn parses_offset_timestamps_as_utc() {
        let parsed = parse_timestamp("2026-07-28T12:00:00.000+02:00").expect("should parse");
        assert_eq!(format_timestamp(parsed), "2026-07-28T10:00:00.000Z");
    }

    #[test]
    fn rejects_unparseable_timestamps() {
        assert!(parse_timestamp("not-a-timestamp").is_none());
        assert!(parse_timestamp("").is_none());
    }

    #[test]
    fn poll_window_starts_before_the_last_line_seen() {
        // Guards against the drop this overlap exists to prevent: the API
        // resolves `since` at second granularity, so a window starting exactly
        // at the newest line can skip a line from that same second.
        let cursor = parse_timestamp("2026-07-28T10:00:05.500Z").expect("should parse");
        let window_start = cursor - chrono::Duration::seconds(POLL_OVERLAP_SECONDS);
        assert_eq!(format_timestamp(window_start), "2026-07-28T10:00:04.500Z");
    }
}
