use anyhow::{Context, Result, bail};

use crate::{
    constants::get_resource_management_api_url,
    core::{hmac::AuthMode, http_client::post_with_auth},
};

use super::types::MessageResponse;

/// `POST /:id/stop` and `POST /:id/delete` both take no request body and return a
/// synchronous `{message: string}` — no `deploymentId`, no polling. Shared by
/// `stop.rs` and `delete.rs`; only the URL suffix and the confirmation UX differ.
pub(crate) fn call_lifecycle_action(
    auth_mode: &AuthMode,
    resource_id: &str,
    action: &str,
) -> Result<MessageResponse> {
    let url = format!(
        "{}/platform-resources/{}/{}",
        get_resource_management_api_url(),
        resource_id,
        action
    );

    // Neither route declares a request body schema — send an empty object rather
    // than `null`, the more conventional "no meaningful body" shape for a POST.
    let response = post_with_auth(auth_mode, &url, serde_json::json!({}))
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
        .with_context(|| "Failed to parse response")
}
