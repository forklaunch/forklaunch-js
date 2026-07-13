use anyhow::{Context, Result, anyhow, bail};

use crate::{
    constants::get_resource_management_api_url,
    core::{hmac::AuthMode, http_client::get_with_auth, manifest::application::ApplicationManifestData},
};

use super::types::{ResourceDetailResponse, ResourceListItem};

/// `fl infra` is JWT/session-only in v1 — resource-management's routes have no HMAC
/// support (`AccessLevel` forbids RBAC on `internal`-only routes, so adding it would
/// give any HMAC-secret holder unrestricted mutate access). CI/automation support is
/// tracked as a v2 item in TODOS.md, not attempted here.
pub(crate) fn require_jwt_mode(auth_mode: &AuthMode) -> Result<()> {
    if auth_mode.is_hmac() {
        bail!(
            "fl infra commands are not supported in CI/HMAC mode yet — JWT/session auth is required. \
             See TODOS.md for CI support tracking."
        );
    }
    Ok(())
}

/// Maps the CLI's friendly resource-type token (matching `ResourceInventory`'s field
/// names) to the platform's exact `IntegrationType` string.
pub(crate) fn resource_type_to_integration_type(token: &str) -> Result<&'static str> {
    match token {
        "database" => Ok("database"),
        "cache" => Ok("cache"),
        "queue" => Ok("messagequeue"),
        "object-store" => Ok("objectstore"),
        other => Err(anyhow!(
            "unknown resource type '{other}' — expected one of: database, cache, queue, object-store"
        )),
    }
}

/// Fetches every provisioned resource for the application in a given environment.
/// Shared by `fl infra list` and every resolving subcommand — do not duplicate this
/// call elsewhere; both call sites must stay on this one function.
pub(crate) fn fetch_application_resources(
    auth_mode: &AuthMode,
    application_id: &str,
    environment: &str,
) -> Result<Vec<ResourceListItem>> {
    let url = format!(
        "{}/platform-resources/application/{}?environment={}",
        get_resource_management_api_url(),
        application_id,
        environment
    );

    let response = get_with_auth(auth_mode, &url)
        .with_context(|| "Failed to reach resource-management API")?;
    let status = response.status();

    if !status.is_success() {
        let body = response
            .text()
            .unwrap_or_else(|_| "unknown error".to_string());
        bail!("resource-management API returned {} — {}", status, body);
    }

    response
        .json()
        .with_context(|| "Failed to parse resource list response")
}

/// Fetches the full detail (including `manifestConfig`) for a resolved resource id.
/// Shared by `status`'s full view, `status --config`'s narrower view, and the
/// mutation commands' pre-change diff — all are the same underlying `GET
/// /:resourceId` call, differing only in what they do with the result.
pub(crate) fn fetch_resource_detail(
    auth_mode: &AuthMode,
    resource_id: &str,
) -> Result<ResourceDetailResponse> {
    let url = format!(
        "{}/platform-resources/{}",
        get_resource_management_api_url(),
        resource_id
    );

    let response =
        get_with_auth(auth_mode, &url).with_context(|| "Failed to reach resource-management API")?;
    let status = response.status();

    if !status.is_success() {
        let body = response
            .text()
            .unwrap_or_else(|_| "unknown error".to_string());
        bail!("resource-management API returned {} — {}", status, body);
    }

    response
        .json()
        .with_context(|| "Failed to parse resource detail response")
}

/// A resolved `<project>:<type>` identifier, ready to address a specific platform
/// resource.
pub(crate) struct ResolvedResource {
    pub(crate) id: String,
    pub(crate) project_name: String,
    pub(crate) resource_type: String,
}

/// Resolves a `<project-name>:<resource-type>` identifier (or an explicit
/// `--resource-id` override) to a concrete platform resource id.
///
/// Order: parse the token (no network) -> confirm the manifest actually configures
/// that resource for that project (no network) -> fetch and filter against the
/// platform's live resource list (network) -> disambiguate.
pub(crate) fn resolve(
    auth_mode: &AuthMode,
    manifest: &ApplicationManifestData,
    application_id: &str,
    environment: &str,
    resource_arg: &str,
    resource_id_override: Option<&str>,
) -> Result<ResolvedResource> {
    let (project_name, resource_type) = resource_arg
        .split_once(':')
        .ok_or_else(|| anyhow!("expected '<project-name>:<resource-type>', got '{resource_arg}'"))?;

    let mapped_type = resource_type_to_integration_type(resource_type)?;

    if let Some(id) = resource_id_override {
        return Ok(ResolvedResource {
            id: id.to_string(),
            project_name: project_name.to_string(),
            resource_type: resource_type.to_string(),
        });
    }

    let project = manifest
        .projects
        .iter()
        .find(|p| p.name == project_name)
        .ok_or_else(|| anyhow!("project '{project_name}' not found in manifest.toml"))?;

    let configured = project.resources.as_ref().map_or(false, |r| match resource_type {
        "database" => r.database.is_some(),
        "cache" => r.cache.is_some(),
        "queue" => r.queue.is_some(),
        "object-store" => r.object_store.is_some(),
        _ => false,
    });

    if !configured {
        bail!(
            "project '{project_name}' has no '{resource_type}' resource configured in manifest.toml"
        );
    }

    let resources = fetch_application_resources(auth_mode, application_id, environment)?;
    let matches: Vec<&ResourceListItem> = resources
        .iter()
        .filter(|r| {
            r.service_name.as_deref() == Some(project_name) && r.r#type == mapped_type
        })
        .collect();

    match matches.len() {
        0 => {
            let available = resources
                .iter()
                .map(|r| format!("{}:{}", r.service_name.as_deref().unwrap_or("?"), r.r#type))
                .collect::<Vec<_>>()
                .join(", ");
            bail!(
                "no '{resource_type}' resource found for project '{project_name}' in environment '{environment}'. \
                 Available resources: {}",
                if available.is_empty() { "none".to_string() } else { available }
            );
        }
        1 => Ok(ResolvedResource {
            id: matches[0].id.clone(),
            project_name: project_name.to_string(),
            resource_type: resource_type.to_string(),
        }),
        _ => {
            let candidates = matches
                .iter()
                .map(|r| {
                    format!(
                        "  id={} region={} status={}",
                        r.id,
                        r.region.as_deref().unwrap_or("?"),
                        r.status
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");
            bail!(
                "multiple '{resource_type}' resources found for project '{project_name}':\n{}\n\
                 Use --resource-id <id> to disambiguate.",
                candidates
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn require_jwt_mode_allows_jwt() {
        assert!(require_jwt_mode(&AuthMode::Jwt).is_ok());
    }

    #[test]
    fn require_jwt_mode_rejects_hmac() {
        let hmac = AuthMode::Hmac {
            secret_key: "test".to_string(),
        };
        let err = require_jwt_mode(&hmac).unwrap_err();
        assert!(err.to_string().contains("CI/HMAC mode"));
    }

    #[test]
    fn resource_type_maps_all_known_tokens() {
        assert_eq!(resource_type_to_integration_type("database").unwrap(), "database");
        assert_eq!(resource_type_to_integration_type("cache").unwrap(), "cache");
        assert_eq!(resource_type_to_integration_type("queue").unwrap(), "messagequeue");
        assert_eq!(
            resource_type_to_integration_type("object-store").unwrap(),
            "objectstore"
        );
    }

    #[test]
    fn resource_type_rejects_unknown_token() {
        let err = resource_type_to_integration_type("bogus").unwrap_err();
        assert!(err.to_string().contains("unknown resource type"));
    }

    #[test]
    fn resource_type_rejects_raw_platform_string() {
        // "queue" (CLI-facing) maps to "messagequeue" (platform) — the raw platform
        // string itself should not also be accepted as a CLI-facing token, to avoid
        // two spellings meaning the same thing.
        assert!(resource_type_to_integration_type("messagequeue").is_err());
    }
}
