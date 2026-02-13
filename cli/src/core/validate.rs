use std::path::PathBuf;

use anyhow::{Context, Result, anyhow};
use clap::ArgMatches;

use super::base_path::{RequiredLocation, find_app_root_path};
use super::hmac::AuthMode;
use super::manifest::application::ApplicationManifestData;
use super::token::get_token;

/// Validates user is authenticated. Returns the auth token.
pub(crate) fn require_auth() -> Result<String> {
    get_token()
}

/// Resolves auth mode: HMAC if env var is set, else JWT (validating token exists).
pub(crate) fn resolve_auth() -> Result<AuthMode> {
    let mode = AuthMode::detect();
    if matches!(mode, AuthMode::Jwt) {
        get_token()?; // validate JWT exists
    }
    Ok(mode)
}

/// Validates manifest exists and parses it. Returns (app_root, manifest).
pub(crate) fn require_manifest(
    matches: &ArgMatches,
) -> Result<(PathBuf, ApplicationManifestData)> {
    let (app_root, _) = find_app_root_path(matches, RequiredLocation::Application)?;
    let manifest_path = app_root.join(".forklaunch").join("manifest.toml");
    let content = std::fs::read_to_string(&manifest_path)
        .with_context(|| format!("Failed to read manifest at {:?}", manifest_path))?;
    let manifest: ApplicationManifestData =
        toml::from_str(&content).with_context(|| "Failed to parse manifest.toml")?;
    Ok((app_root, manifest))
}

/// Validates app is integrated with platform. Returns the application ID.
pub(crate) fn require_integration(manifest: &ApplicationManifestData) -> Result<String> {
    manifest
        .platform_application_id
        .clone()
        .ok_or_else(|| {
            anyhow!("Application not integrated with platform.\nRun: forklaunch integrate --app <app-id>")
        })
}
