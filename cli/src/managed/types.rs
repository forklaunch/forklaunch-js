use serde::{Deserialize, Serialize};

/// One managed instance as the control plane reports it.
///
/// Every field past `id` is optional on purpose. The `/managed-mode` routes are being
/// written in parallel with this CLI, and the summary endpoint and the (not yet
/// implemented) list endpoint return overlapping but not identical projections. A
/// missing field should render as a blank column, not fail the whole command.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ManagedInstance {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) template_slug: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) region: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) state: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) relay_eligible: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) current_version_semver: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) last_error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) claimed_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) created_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AppTemplate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) slug: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) source_repo: Option<String>,
}

/// The template statuses the platform defines. A template is created as `draft`;
/// `instance create` requires `published`, so a template stays uninstantiable until
/// something moves it. The control plane validates this list server-side and answers
/// 400 with the allowed values, but validating here too turns a typo into an instant
/// local error instead of a round trip.
pub(super) const TEMPLATE_STATUSES: &[&str] = &["draft", "published", "retired"];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TemplateVersion {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) semver: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) git_ref: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) published_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ClaimLink {
    pub(super) claim_url: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) expires_at: Option<String>,
}

/// The instance lifecycle states the platform defines, in rough lifecycle order.
///
/// Used to validate and document `--state` in `--help`. Kept as a plain list rather
/// than an enum because the CLI only ever passes these through to the control plane
/// and displays them back — it never branches on them.
pub(super) const INSTANCE_STATES: &[&str] = &[
    "provisioning",
    "provisioning_failed",
    "awaiting_claim",
    "awaiting_claim_blocked",
    "active",
    "suspended",
    "destroying",
    "destroyed",
];

pub(super) fn dash(value: &Option<String>) -> &str {
    value.as_deref().unwrap_or("-")
}
