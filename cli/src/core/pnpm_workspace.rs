use std::{collections::BTreeMap, fs::read_to_string, path::Path};

use anyhow::{Context, Ok, Result};
use serde::{Deserialize, Serialize};
use serde_yml::{Value, from_str, to_string};

use super::{manifest::InitializableManifestConfig, rendered_template::RenderedTemplate};
use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE, ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_READ_PNPM_WORKSPACE,
    },
    core::manifest::{ManifestConfig, ProjectEntry, ProjectManifestConfig},
};

/// Dependencies the scaffold ships (directly or transitively) that run
/// install-time build scripts. pnpm 10+ blocks build scripts unless they are
/// listed under `allowBuilds`; when the list is missing, pnpm writes literal
/// "set this to true or false" placeholders into pnpm-workspace.yaml, which
/// then fail every subsequent install. Pre-seed real values so pnpm never
/// injects placeholders.
const ALLOWED_BUILD_DEPENDENCIES: &[&str] = &[
    "@scarf/scarf",
    "better-sqlite3",
    "cpu-features",
    "esbuild",
    "msgpackr-extract",
    "protobufjs",
    "sqlite3",
    "ssh2",
    "tldjs",
    "unrs-resolver",
];

#[derive(Debug, Deserialize, Serialize, Clone)]
pub(crate) struct PnpmWorkspace {
    pub(crate) packages: Vec<String>,
    #[serde(
        rename = "allowBuilds",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) allow_builds: Option<BTreeMap<String, Value>>,
    // Preserve any keys this struct does not model (overrides, catalogs,
    // blockExoticSubdeps, ...) so re-emitting the file never clobbers
    // consumer or tool-added configuration.
    #[serde(flatten)]
    pub(crate) other: BTreeMap<String, Value>,
}

fn default_allow_builds() -> BTreeMap<String, Value> {
    ALLOWED_BUILD_DEPENDENCIES
        .iter()
        .map(|dep| ((*dep).to_string(), Value::Bool(true)))
        .collect()
}

/// pnpm writes string placeholders ("set this to true or false") for
/// unapproved build deps. Coerce any non-boolean entries to `true` and make
/// sure the scaffold's known build deps are present, healing workspaces that
/// picked up placeholders before this fix.
fn sanitize_allow_builds(pnpm_workspace: &mut PnpmWorkspace) {
    let mut allow_builds = pnpm_workspace
        .allow_builds
        .take()
        .unwrap_or_else(default_allow_builds);
    for value in allow_builds.values_mut() {
        if !matches!(value, Value::Bool(_)) {
            *value = Value::Bool(true);
        }
    }
    for dep in ALLOWED_BUILD_DEPENDENCIES {
        allow_builds
            .entry((*dep).to_string())
            .or_insert(Value::Bool(true));
    }
    pnpm_workspace.allow_builds = Some(allow_builds);
}

/// Tooling (e.g. Studio upgrade flows) writes version-pinned entries like
/// `@forklaunch/core@1.5.9` into `minimumReleaseAgeExclude`. After a
/// framework release those pins go stale: pnpm blocks the new version with
/// ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION and in-range resolution falls back
/// to the old one. First-party packages should always be exempt from the age
/// gate, so strip version suffixes down to bare package names on every
/// rewrite.
fn sanitize_minimum_release_age_exclude(pnpm_workspace: &mut PnpmWorkspace) {
    let Some(Value::Sequence(entries)) =
        pnpm_workspace.other.get_mut("minimumReleaseAgeExclude")
    else {
        return;
    };
    let mut seen: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    let mut normalized: Vec<Value> = Vec::new();
    for entry in entries.iter() {
        match entry {
            Value::String(spec) if spec.starts_with("@forklaunch/") => {
                // find a version separator after the scope's leading '@'
                let name = match spec[1..].find('@') {
                    Some(index) => spec[..index + 1].to_string(),
                    None => spec.clone(),
                };
                if seen.insert(name.clone()) {
                    normalized.push(Value::String(name));
                }
            }
            Value::String(spec) => {
                if seen.insert(spec.clone()) {
                    normalized.push(entry.clone());
                }
            }
            _ => normalized.push(entry.clone()),
        }
    }
    *entries = normalized;
}

/// Set-if-missing on every rewrite path, not just initial creation, so an
/// app that already existed before this default was introduced (or had the
/// key stripped) still gets it back.
fn ensure_minimum_release_age(pnpm_workspace: &mut PnpmWorkspace) {
    pnpm_workspace
        .other
        .entry("minimumReleaseAge".to_string())
        .or_insert(Value::Number(1440.into()));
}

/// Pin explicitly rather than leave unset: pnpm >=11.2 defaults
/// minimumReleaseAge to 1440 (24h), but a scaffold's local `pnpm install`
/// may run on an older pnpm with no age gate at all, resolving versions the
/// deploy pipeline's newer pnpm then rejects from an already-locked
/// lockfile. Setting it explicitly makes local resolution skip too-new
/// versions the same way deploy does, so the generated lockfile is already
/// compliant. Same value as forklaunch-platform's own pnpm-workspace.yaml.
fn default_other() -> BTreeMap<String, Value> {
    BTreeMap::from([("minimumReleaseAge".to_string(), Value::Number(1440.into()))])
}

pub(crate) fn generate_pnpm_workspace(
    application_path: &str,
    additional_projects: &Vec<ProjectEntry>,
) -> Result<Option<RenderedTemplate>> {
    let pnpm_workspace_path = Path::new(application_path).join("pnpm-workspace.yaml");
    if pnpm_workspace_path.exists() {
        return Ok(None);
    }

    Ok(Some(RenderedTemplate {
        path: pnpm_workspace_path,
        content: to_string(&PnpmWorkspace {
            packages: additional_projects.iter().map(|p| p.name.clone()).collect(),
            allow_builds: Some(default_allow_builds()),
            other: default_other(),
        })
        .with_context(|| ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE)?,
        context: None,
    }))
}

/// Render a pnpm-workspace.yaml with the given package list, preserving any
/// existing configuration (allowBuilds, overrides, ...) from the file at
/// `base_path` when present.
pub(crate) fn render_pnpm_workspace_with_packages(
    base_path: &Path,
    packages: Vec<String>,
) -> Result<String> {
    let pnpm_workspace_path = base_path.join("pnpm-workspace.yaml");
    let mut pnpm_workspace: PnpmWorkspace = if pnpm_workspace_path.exists() {
        from_str(
            &read_to_string(&pnpm_workspace_path)
                .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?
    } else {
        PnpmWorkspace {
            packages: Vec::new(),
            allow_builds: None,
            other: default_other(),
        }
    };
    pnpm_workspace.packages = packages;
    sanitize_allow_builds(&mut pnpm_workspace);
    sanitize_minimum_release_age_exclude(&mut pnpm_workspace);
    ensure_minimum_release_age(&mut pnpm_workspace);
    Ok(to_string(&pnpm_workspace)
        .with_context(|| ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE)?)
}

pub(crate) fn add_project_definition_to_pnpm_workspace<
    T: ManifestConfig + ProjectManifestConfig + InitializableManifestConfig + Serialize,
>(
    base_path: &Path,
    manifest_data: &T,
) -> Result<String> {
    let pnpm_workspace_path = base_path.join("pnpm-workspace.yaml");
    let mut pnpm_workspace: PnpmWorkspace = from_str(
        &read_to_string(&pnpm_workspace_path)
            .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?;
    if !pnpm_workspace.packages.contains(&manifest_data.name()) {
        pnpm_workspace.packages.push(manifest_data.name().clone());
    }
    sanitize_allow_builds(&mut pnpm_workspace);
    sanitize_minimum_release_age_exclude(&mut pnpm_workspace);
    ensure_minimum_release_age(&mut pnpm_workspace);
    Ok(to_string(&pnpm_workspace)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?)
}

pub(crate) fn remove_project_definition_to_pnpm_workspace(
    base_path: &Path,
    project_name: &str,
) -> Result<String> {
    let pnpm_workspace_path = base_path.join("pnpm-workspace.yaml");
    let mut pnpm_workspace: PnpmWorkspace = from_str(
        &read_to_string(&pnpm_workspace_path)
            .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?;
    if let Some(position) = pnpm_workspace
        .packages
        .iter()
        .position(|name| name == project_name)
    {
        pnpm_workspace.packages.remove(position);
    }
    sanitize_allow_builds(&mut pnpm_workspace);
    sanitize_minimum_release_age_exclude(&mut pnpm_workspace);
    ensure_minimum_release_age(&mut pnpm_workspace);

    Ok(to_string(&pnpm_workspace)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minimum_release_age_exclude_strips_forklaunch_versions() {
        let mut ws: PnpmWorkspace = from_str(
            "packages:\n- core\nminimumReleaseAgeExclude:\n- '@forklaunch/core@1.5.9'\n- '@forklaunch/express@1.2.37'\n- '@forklaunch/core@1.5.10'\n- 'left-pad@1.3.0'\n",
        )
        .unwrap();
        sanitize_minimum_release_age_exclude(&mut ws);
        let rendered = to_string(&ws).unwrap();
        assert!(rendered.contains("- '@forklaunch/core'"));
        assert!(rendered.contains("- '@forklaunch/express'"));
        // duplicates collapse, non-forklaunch entries untouched
        assert_eq!(rendered.matches("@forklaunch/core").count(), 1);
        assert!(rendered.contains("left-pad@1.3.0"));
    }

    #[test]
    fn test_minimum_release_age_exclude_absent_is_noop() {
        let mut ws: PnpmWorkspace = from_str("packages:\n- core\n").unwrap();
        sanitize_minimum_release_age_exclude(&mut ws);
        assert!(!to_string(&ws).unwrap().contains("minimumReleaseAgeExclude"));
    }

    #[test]
    fn test_generate_pnpm_workspace_pins_minimum_release_age() {
        let dir = tempfile::tempdir().unwrap();
        let rendered = generate_pnpm_workspace(dir.path().to_str().unwrap(), &Vec::new())
            .unwrap()
            .unwrap();
        assert!(rendered.content.contains("minimumReleaseAge: 1440"));
    }

    #[test]
    fn test_render_pnpm_workspace_with_packages_pins_minimum_release_age_when_file_missing() {
        let dir = tempfile::tempdir().unwrap();
        let rendered =
            render_pnpm_workspace_with_packages(dir.path(), vec!["core".to_string()]).unwrap();
        assert!(rendered.contains("minimumReleaseAge: 1440"));
    }

    #[test]
    fn test_ensure_minimum_release_age_backfills_when_absent() {
        let mut ws: PnpmWorkspace = from_str("packages:\n- core\n").unwrap();
        ensure_minimum_release_age(&mut ws);
        assert!(to_string(&ws).unwrap().contains("minimumReleaseAge: 1440"));
    }

    #[test]
    fn test_ensure_minimum_release_age_preserves_existing_value() {
        let mut ws: PnpmWorkspace =
            from_str("packages:\n- core\nminimumReleaseAge: 0\n").unwrap();
        ensure_minimum_release_age(&mut ws);
        assert!(to_string(&ws).unwrap().contains("minimumReleaseAge: 0"));
    }
}
