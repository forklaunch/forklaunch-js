use std::io::Write;

use anyhow::Result;
use reqwest::{
    Method,
    blocking::{Client, Response},
};
use serde_json::Value;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use super::token::{get_token, get_token_path};

/// Makes an authenticated HTTP request with automatic token refresh and retry logic
///
/// If the request returns 401 or 403, this function will:
/// 1. Force token refresh by calling get_token() again
/// 2. Retry the request once with the new token
/// 3. If refresh fails, trigger auto re-login flow
pub fn make_authenticated_request(
    method: Method,
    url: &str,
    body: Option<Value>,
) -> Result<Response> {
    // First attempt
    match try_authenticated_request(method.clone(), url, body.clone(), false) {
        Ok(response) => {
            let status = response.status();

            // Check if we got auth error
            if status == 401 || status == 403 {
                // Try to refresh token and retry ONCE
                handle_auth_failure_and_retry(method, url, body)
            } else {
                Ok(response)
            }
        }
        Err(e) => Err(e),
    }
}

/// Attempts to make an authenticated request
fn try_authenticated_request(
    method: Method,
    url: &str,
    body: Option<Value>,
    force_refresh: bool,
) -> Result<Response> {
    // Get token (this will auto-refresh if expired)
    let token = if force_refresh {
        // Delete the token file to force fresh login
        let token_path = get_token_path()?;
        if token_path.exists() {
            std::fs::remove_file(&token_path)?;
        }
        get_token()?
    } else {
        get_token()?
    };

    let client = Client::new();
    let mut request = client
        .request(method, url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/json");

    if let Some(json_body) = body {
        request = request.json(&json_body);
    }

    Ok(request.send()?)
}

/// Handles authentication failure by refreshing token or triggering re-login
fn handle_auth_failure_and_retry(
    method: Method,
    url: &str,
    body: Option<Value>,
) -> Result<Response> {
    let mut stdout = StandardStream::stdout(ColorChoice::Always);

    // Try to refresh the token first by deleting the token file
    // This will trigger a fresh token fetch on next get_token() call
    let token_path = get_token_path()?;
    if token_path.exists() {
        std::fs::remove_file(&token_path)?;
    }

    // Try to get a new token (will use existing session if valid)
    match get_token() {
        Ok(_) => {
            // Token refresh succeeded, retry the request
            try_authenticated_request(method, url, body, false)
        }
        Err(_) => {
            // Token refresh failed, trigger auto re-login
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(
                &mut stdout,
                "\nAuthentication expired. Please log in again."
            )?;
            stdout.reset()?;

            // Trigger login flow
            crate::login::login()?;

            // Retry request with new token
            try_authenticated_request(method, url, body, false)
        }
    }
}

/// Helper to make a GET request with authentication
pub fn get(url: &str) -> Result<Response> {
    make_authenticated_request(Method::GET, url, None)
}

/// Helper to make a POST request with authentication
pub fn post(url: &str, body: Value) -> Result<Response> {
    make_authenticated_request(Method::POST, url, Some(body))
}

/// Helper to make a PUT request with authentication
pub fn put(url: &str, body: Value) -> Result<Response> {
    make_authenticated_request(Method::PUT, url, Some(body))
}

/// Helper to make a DELETE request with authentication
#[allow(dead_code)]
pub fn delete(url: &str) -> Result<Response> {
    make_authenticated_request(Method::DELETE, url, None)
}

/// Helper to make a PATCH request with authentication
#[allow(dead_code)]
pub fn patch(url: &str, body: Value) -> Result<Response> {
    make_authenticated_request(Method::PATCH, url, Some(body))
}
