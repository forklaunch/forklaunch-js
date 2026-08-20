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
                Arg::new("region")
                    .short('r')
                    .long("region")
                    .help("Cloud region to inspect (for example: us-west-2); defaults to every region the environment is deployed in"),
            )
            .arg(
                Arg::new("service")
                    .short('s')
                    .long("service")
                    .help("Filter to a specific service or worker name"),
            )
            .arg(
                Arg::new("deployment")
                    .long("deployment")
                    .help("Filter to logs emitted by tasks of one deployment id"),
            )
            .arg(
                Arg::new("level")
                    .long("level")
                    .help("Filter by log level (error, warn, info, debug)"),
            )
            .arg(
                Arg::new("query")
                    .short('q')
                    .long("query")
                    .help("Only lines containing this text"),
            )
            .arg(
                Arg::new("source")
                    .long("source")
                    .value_parser(["otel", "cloudwatch"])
                    .default_value("otel")
                    .help(
                        "Log source: otel = the app's OpenTelemetry pipeline (structured, filter-rich); \
                         cloudwatch = raw container stdout/stderr captured by the platform (survives \
                         crashes that happen before the OTel exporter flushes)",
                    ),
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
        let source = matches
            .get_one::<String>("source")
            .map(String::as_str)
            .unwrap_or("otel");
        let filters = LogFilters {
            environment,
            region: matches.get_one::<String>("region").cloned(),
            service: matches.get_one::<String>("service").cloned(),
            deployment_id: matches.get_one::<String>("deployment").cloned(),
            level: matches.get_one::<String>("level").cloned(),
            query: matches.get_one::<String>("query").cloned(),
            since: matches.get_one::<String>("since").cloned(),
            // The server defaults to the OTel/Loki pipeline; only "cloudwatch"
            // needs to be sent explicitly.
            source: (source == "cloudwatch").then(|| source.to_string()),
        };
        // Raw container output carries no OTel resource attributes, so a
        // deployment filter would be silently ignored server-side — reject it
        // instead of returning results that look filtered but aren't.
        if filters.source.is_some() && filters.deployment_id.is_some() {
            anyhow::bail!(
                "--deployment filters on OTel resource attributes, which raw CloudWatch \
                 output does not carry. Drop --deployment or use --source otel."
            );
        }
        let limit: u32 = matches.get_one::<u32>("limit").copied().unwrap_or(100);
        let follow = matches.get_flag("follow");
        let json_output = matches.get_flag("json");

        if follow {
            if filters.source.is_some() {
                anyhow::bail!(
                    "--follow streams from the OTel pipeline and cannot be combined with \
                     --source cloudwatch. Poll instead: fl observe logs --source cloudwatch --since <ts>"
                );
            }
            stream_logs(&application_id, &filters, limit, json_output)
        } else {
            query_logs(&application_id, &filters, limit, json_output)
        }
    }
}

/// Server-side log filters forwarded as query params (see the observability
/// API's ServiceLogsQuerySchema).
#[derive(Clone)]
struct LogFilters {
    environment: String,
    region: Option<String>,
    service: Option<String>,
    deployment_id: Option<String>,
    level: Option<String>,
    query: Option<String>,
    since: Option<String>,
    /// "cloudwatch" to read raw container stdout/stderr; None = OTel/Loki (server default).
    source: Option<String>,
}

// ── HTTP query (no --follow) ──────────────────────────────────────────────────

fn query_logs(
    application_id: &str,
    filters: &LogFilters,
    limit: u32,
    json_output: bool,
) -> Result<()> {
    let response = fetch_logs(application_id, filters, limit)?;

    if json_output {
        println!("{}", serde_json::to_string_pretty(&response)?);
    } else {
        print_logs(&response.logs)?;
    }

    Ok(())
}

fn fetch_logs(application_id: &str, filters: &LogFilters, limit: u32) -> Result<LogsResponse> {
    let api_url = get_observability_api_url();
    let mut url = format!(
        "{}/applications/{}/logs?environment={}&limit={}&direction=backward",
        api_url,
        application_id,
        urlencoding::encode(&filters.environment),
        limit
    );
    let mut push_param = |key: &str, value: &Option<String>| {
        if let Some(v) = value {
            url.push_str(&format!("&{}={}", key, urlencoding::encode(v)));
        }
    };
    push_param("region", &filters.region);
    push_param("service", &filters.service);
    push_param("deploymentId", &filters.deployment_id);
    push_param("level", &filters.level);
    push_param("q", &filters.query);
    push_param("since", &filters.since);
    push_param("source", &filters.source);

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

/// Live-tail by polling the same endpoint the one-shot query uses, asking each
/// time for logs newer than the newest one already printed.
///
/// This previously subscribed to a WebSocket channel, which could not work:
/// the CLI derived the socket URL from the HTTP API base, but the monitoring
/// socket listens on its own port (WS_PORT), and nothing on the server ever
/// published to the log channels it subscribed to. Polling reuses the request
/// path, auth, and every server-side filter that already works for the
/// one-shot query, so it needs no additional infrastructure.
fn stream_logs(
    application_id: &str,
    filters: &LogFilters,
    limit: u32,
    json_output: bool,
) -> Result<()> {
    let mut seen = SeenLogIds::new(SEEN_IDS_CAPACITY);

    // Seed from recent history so the tail opens with context, oldest first.
    let initial = fetch_logs(application_id, filters, limit)?;
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
            application_id, filters.environment
        )?;
        stdout.reset()?;
    }

    loop {
        sleep(POLL_INTERVAL);

        let window_start = cursor - chrono::Duration::seconds(POLL_OVERLAP_SECONDS);
        let poll_filters = LogFilters {
            since: Some(format_timestamp(window_start)),
            ..filters.clone()
        };
        let page = fetch_logs(application_id, &poll_filters, limit)?;

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
        let level = entry.display_level();
        let color = level_color(&level);

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

impl LogEntry {
    /// The severity to display. The top-level `level` may be absent on older
    /// API versions (no indexed level label in Loki) — fall back to the
    /// structured-metadata severity the pipeline actually populates, and never
    /// invent a level: an unknown severity renders as "-", not "info".
    fn display_level(&self) -> String {
        if let Some(l) = self.level.as_deref() {
            if !l.is_empty() {
                return l.to_lowercase();
            }
        }
        for key in ["detected_level", "severity_text", "level"] {
            if let Some(l) = self.labels.get(key).and_then(|v| v.as_str()) {
                if !l.is_empty() {
                    return l.to_lowercase();
                }
            }
        }
        "-".to_string()
    }
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
        // The API resolves `since` at second granularity, so a window starting
        // exactly at the newest line can skip a line from that same second.
        let cursor = parse_timestamp("2026-07-28T10:00:05.500Z").expect("should parse");
        let window_start = cursor - chrono::Duration::seconds(POLL_OVERLAP_SECONDS);
        assert_eq!(format_timestamp(window_start), "2026-07-28T10:00:04.500Z");
    }
}
