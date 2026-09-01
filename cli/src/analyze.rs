//! `forklaunch analyze` — read-only workspace inspection that emits a structured JSON
//! description of the application (modules, entities, schemas, routers, services, workers).
//!
//! Designed to be consumed by tooling that needs a canonical, parser-stable view of the
//! workspace — primarily the studio orchestrator's planner. By reusing the existing
//! `core/static_analysis` modules (the same ones `change/router.rs` and `change/service.rs`
//! call), we guarantee the orchestrator and the CLI agree on what the workspace looks
//! like, eliminating an entire class of parser-drift bugs.
//!
//! Output goes to stdout; progress + warnings go to stderr. Stdout is parseable JSON.

use std::{
    fs::read_dir,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use serde::Serialize;
use serde_json::json;

use crate::{
    CliCommand,
    compliance::checks::run_local_checks,
    core::{
        command::command,
        manifest::ProjectType,
        report_card::build_local_report_card,
        static_analysis::{
            EntityAnalyzer, SchemaAnalyzer,
            entity_analyzer::{EntityProperty, RelationType},
        },
        validate::require_manifest,
    },
};

pub(crate) struct AnalyzeCommand;

impl AnalyzeCommand {
    pub(crate) fn new() -> Self {
        Self
    }
}

impl CliCommand for AnalyzeCommand {
    fn command(&self) -> Command {
        command(
            "analyze",
            "Emit a structured JSON snapshot of the workspace (modules, entities, schemas). Read-only.",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("Application root path (defaults to the current directory's manifest)"),
        )
        .arg(
            Arg::new("format")
                .long("format")
                .help("Output format")
                .value_parser(["json"])
                .default_value("json"),
        )
        .arg(
            Arg::new("module")
                .short('m')
                .long("module")
                .help("Filter to a single module by name"),
        )
        .arg(
            Arg::new("pretty")
                .long("pretty")
                .help("Pretty-print JSON output")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("report_card")
                .long("report-card")
                .help(
                    "Emit an Enterprise-Readiness Report Card built from deterministic checks \
                     instead of the structural snapshot",
                )
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("min_score")
                .long("min-score")
                .help(
                    "With --report-card, exit non-zero if the overall score is below this \
                     (0-100). For CI gating.",
                )
                .value_parser(clap::value_parser!(u32).range(0..=100)),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let (app_root, manifest) = require_manifest(matches)?;
        let module_filter = matches.get_one::<String>("module").cloned();
        let pretty = matches.get_flag("pretty");

        let modules = collect_modules(
            &app_root,
            &manifest.modules_path,
            &manifest.projects,
            module_filter.as_deref(),
        )?;

        if matches.get_flag("report_card") {
            // The deterministic checks are the same ones `forklaunch compliance
            // audit` runs; this presents them on the shared report-card contract
            // so plan, build and audit surfaces all speak one shape.
            let modules_root = app_root.join(&manifest.modules_path);
            let findings = run_local_checks(&modules_root)?;
            let card = build_local_report_card(
                &manifest.app_name,
                modules.len(),
                &findings,
                iso8601_now(),
            );

            let serialized = if pretty {
                serde_json::to_string_pretty(&json!(card))?
            } else {
                serde_json::to_string(&json!(card))?
            };
            println!("{}", serialized);

            if let Some(min) = matches.get_one::<u32>("min_score")
                && card.overall < *min
            {
                anyhow::bail!(
                    "report card overall score {} is below the required minimum of {}",
                    card.overall,
                    min
                );
            }
            return Ok(());
        }

        let doc = AnalyzeDocument {
            app_name: manifest.app_name.clone(),
            modules_path: manifest.modules_path.clone(),
            modules,
        };

        let serialized = if pretty {
            serde_json::to_string_pretty(&json!(doc))?
        } else {
            serde_json::to_string(&json!(doc))?
        };
        println!("{}", serialized);
        Ok(())
    }
}

// ─── Output DTOs ───────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct AnalyzeDocument {
    #[serde(rename = "appName")]
    app_name: String,
    #[serde(rename = "modulesPath")]
    modules_path: String,
    modules: Vec<ModuleEntry>,
}

#[derive(Serialize)]
struct ModuleEntry {
    name: String,
    kind: String,
    description: Option<String>,
    entities: Vec<EntityEntry>,
    schemas: Vec<SchemaEntry>,
    routers: Vec<String>,
    services: Vec<String>,
    workers: Vec<String>,
}

#[derive(Serialize)]
struct EntityEntry {
    name: String,
    fields: Vec<FieldEntry>,
    relations: Vec<RelationEntry>,
}

#[derive(Serialize)]
struct FieldEntry {
    name: String,
    #[serde(rename = "typeName")]
    type_name: String,
    nullable: bool,
    collection: bool,
}

#[derive(Serialize)]
struct RelationEntry {
    field: String,
    #[serde(rename = "toEntity")]
    to_entity: String,
    cardinality: String,
}

#[derive(Serialize)]
struct SchemaEntry {
    #[serde(rename = "exportName")]
    export_name: String,
    fields: Vec<String>,
}

// ─── Module collection ─────────────────────────────────────────────────────────

fn collect_modules(
    app_root: &Path,
    modules_path: &str,
    projects: &[crate::core::manifest::ProjectEntry],
    filter: Option<&str>,
) -> Result<Vec<ModuleEntry>> {
    let modules_root = app_root.join(modules_path);
    let mut entries = Vec::new();

    for project in projects {
        if let Some(name) = filter {
            if project.name != name {
                continue;
            }
        }
        // Skip built-in modules that the orchestrator never plans against.
        if is_builtin_module(&project.name) {
            continue;
        }
        let module_dir = modules_root.join(&project.name);
        if !module_dir.is_dir() {
            // Project named in the manifest but the directory isn't on disk yet — skip.
            continue;
        }

        let kind = match project.r#type {
            ProjectType::Service => "service",
            ProjectType::Worker => "worker",
            ProjectType::Library => "library",
        };

        let entities = collect_entities(&module_dir).unwrap_or_else(|err| {
            eprintln!(
                "warning: failed to analyze entities for module '{}': {}",
                project.name, err
            );
            Vec::new()
        });
        let schemas = collect_schemas(&module_dir).unwrap_or_else(|err| {
            eprintln!(
                "warning: failed to analyze schemas for module '{}': {}",
                project.name, err
            );
            Vec::new()
        });
        let routers = project
            .routers
            .clone()
            .unwrap_or_else(|| list_basenames(&module_dir.join("api/routes"), ".routes.ts"));
        let services = list_basenames(&module_dir.join("domain/services"), ".service.ts");
        let workers = list_workers(&module_dir);

        entries.push(ModuleEntry {
            name: project.name.clone(),
            kind: kind.to_string(),
            description: Some(project.description.clone()).filter(|s| !s.is_empty()),
            entities,
            schemas,
            routers,
            services,
            workers,
        });
    }

    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

fn is_builtin_module(name: &str) -> bool {
    matches!(
        name,
        "core" | "monitoring" | "client-sdk" | "iam" | "billing" | "messaging"
    )
}

fn collect_entities(module_dir: &Path) -> Result<Vec<EntityEntry>> {
    let entities_dir = module_dir.join("persistence/entities");
    let mut out = Vec::new();
    if !entities_dir.is_dir() {
        return Ok(out);
    }
    for entry in
        read_dir(&entities_dir).with_context(|| format!("read_dir {}", entities_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path
            .file_name()
            .and_then(|s| s.to_str())
            .map(|s| s.ends_with(".entity.ts"))
            .unwrap_or(false)
        {
            continue;
        }
        let defs = EntityAnalyzer::parse_entity_file(&path).unwrap_or_else(|err| {
            eprintln!("warning: failed to parse {}: {}", path.display(), err);
            Vec::new()
        });
        for def in defs {
            let mut fields = Vec::new();
            let mut relations = Vec::new();
            for property in &def.properties {
                match &property.relation_type {
                    Some(rel) => relations.push(RelationEntry {
                        field: property.name.clone(),
                        to_entity: property.type_name.clone(),
                        cardinality: cardinality_name(rel),
                    }),
                    None => fields.push(field_entry(property)),
                }
            }
            out.push(EntityEntry {
                name: def.name,
                fields,
                relations,
            });
        }
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

fn field_entry(property: &EntityProperty) -> FieldEntry {
    FieldEntry {
        name: property.name.clone(),
        type_name: property.type_name.clone(),
        nullable: property.is_nullable,
        collection: property.is_collection,
    }
}

fn cardinality_name(rel: &RelationType) -> String {
    match rel {
        RelationType::ManyToOne => "N:1".to_string(),
        RelationType::OneToMany => "1:N".to_string(),
        RelationType::ManyToMany => "M:N".to_string(),
        RelationType::OneToOne => "1:1".to_string(),
    }
}

fn collect_schemas(module_dir: &Path) -> Result<Vec<SchemaEntry>> {
    let schemas_dir = module_dir.join("domain/schemas");
    let mut out = Vec::new();
    if !schemas_dir.is_dir() {
        return Ok(out);
    }
    for entry in
        read_dir(&schemas_dir).with_context(|| format!("read_dir {}", schemas_dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if !path
            .file_name()
            .and_then(|s| s.to_str())
            .map(|s| s.ends_with(".schema.ts"))
            .unwrap_or(false)
        {
            continue;
        }
        let defs = SchemaAnalyzer::parse_schema_file(&path).unwrap_or_else(|err| {
            eprintln!("warning: failed to parse {}: {}", path.display(), err);
            Vec::new()
        });
        for def in defs {
            out.push(SchemaEntry {
                export_name: def.name,
                fields: def.properties.iter().map(|p| p.name.clone()).collect(),
            });
        }
    }
    out.sort_by(|a, b| a.export_name.cmp(&b.export_name));
    Ok(out)
}

fn list_basenames(dir: &Path, suffix: &str) -> Vec<String> {
    let mut out = Vec::new();
    let Ok(read) = read_dir(dir) else {
        return out;
    };
    for entry in read.flatten() {
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else {
            continue;
        };
        if !name.ends_with(suffix) {
            continue;
        }
        out.push(name.trim_end_matches(suffix).to_string());
    }
    out.sort();
    out
}

fn list_workers(module_dir: &Path) -> Vec<String> {
    // Workers are detected by either a `worker.ts` file at the module root or any
    // `*-worker.ts` file. Best-effort — matches the heuristic the studio uses today.
    let mut out = Vec::new();
    let Ok(read) = read_dir(module_dir) else {
        return out;
    };
    for entry in read.flatten() {
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else {
            continue;
        };
        if name == "worker.ts" {
            out.push("worker".to_string());
            continue;
        }
        if name.ends_with("-worker.ts") {
            out.push(name.trim_end_matches(".ts").to_string());
        }
    }
    out.sort();
    out
}

// Convenience for tests / callers that want a typed handle on the document instead of JSON.
#[allow(dead_code)]
pub(crate) fn analyze_workspace(
    app_root: &Path,
    modules_path: &str,
    projects: &[crate::core::manifest::ProjectEntry],
    module_filter: Option<&str>,
) -> Result<serde_json::Value> {
    let modules = collect_modules(app_root, modules_path, projects, module_filter)?;
    let doc = AnalyzeDocument {
        app_name: String::new(),
        modules_path: modules_path.to_string(),
        modules,
    };
    Ok(serde_json::to_value(&doc)?)
}

// Path utility so callers don't have to recompute.
#[allow(dead_code)]
pub(crate) fn module_dir(app_root: &Path, modules_path: &str, module: &str) -> PathBuf {
    app_root.join(modules_path).join(module)
}

/// UTC timestamp for the card's `generatedAt`, without pulling in a date crate.
fn iso8601_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    // Days since epoch -> civil date (Howard Hinnant's algorithm).
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y,
        m,
        d,
        rem / 3_600,
        (rem % 3_600) / 60,
        rem % 60
    )
}

#[cfg(test)]
mod timestamp_tests {
    use super::iso8601_now;

    #[test]
    fn emits_a_well_formed_utc_timestamp() {
        // Hand-rolled civil-date maths is easy to get subtly wrong, and a bad
        // `generatedAt` would corrupt every card this command emits.
        let stamp = iso8601_now();
        assert_eq!(stamp.len(), 20, "{stamp}");
        assert!(stamp.ends_with('Z'), "{stamp}");

        let (date, time) = stamp[..19].split_once('T').expect("T separator");
        let parts: Vec<u32> = date.split('-').map(|p| p.parse().unwrap()).collect();
        assert!(parts[0] >= 2026, "year looks wrong: {stamp}");
        assert!((1..=12).contains(&parts[1]), "month out of range: {stamp}");
        assert!((1..=31).contains(&parts[2]), "day out of range: {stamp}");

        let t: Vec<u32> = time.split(':').map(|p| p.parse().unwrap()).collect();
        assert!(t[0] < 24 && t[1] < 60 && t[2] < 60, "time out of range: {stamp}");
    }
}
