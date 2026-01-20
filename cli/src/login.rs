use std::{
    fs::{create_dir_all, write},
    io::Write,
    thread::sleep,
    time::Duration,
};

use anyhow::{Result, bail};
use clap::{ArgMatches, Command};
use serde::{Deserialize, Serialize};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::get_iam_api_url,
    core::{command::command, token::get_token_path},
};

pub(super) struct LoginCommand;

impl LoginCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    verification_uri_complete: Option<String>,
    interval: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct TokenErrorResponse {
    error: String,
    error_description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenData {
    access_token: String,
    refresh_token: String,
    expires_at: i64,
}

pub fn login() -> Result<()> {
    let mut stdout = StandardStream::stdout(ColorChoice::Always);
    let api_url = get_iam_api_url();

    // Step 1: Request device code
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "Forklaunch CLI Login")?;
    writeln!(stdout, "Requesting device authorization...")?;
    stdout.reset()?;

    let client = reqwest::blocking::Client::new();
    let device_response = client
        .post(format!("{}/api/auth/device/code", api_url))
        .json(&serde_json::json!({
            "client_id": "forklaunch-cli",
            "scope": "openid profile email"
        }))
        .send()?;

    if !device_response.status().is_success() {
        bail!(
            "Failed to request device code: {}",
            device_response.status()
        );
    }

    let device_data: DeviceCodeResponse = device_response.json()?;

    // Step 2: Display user code and open browser
    writeln!(stdout)?;
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)).set_bold(true))?;
    writeln!(stdout, "Please visit: {}", device_data.verification_uri)?;
    writeln!(stdout, "Enter code: {}", device_data.user_code)?;
    stdout.reset()?;
    writeln!(stdout)?;

    // Try to open browser
    let url_to_open = device_data
        .verification_uri_complete
        .as_ref()
        .unwrap_or(&device_data.verification_uri);

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "Opening browser...")?;
    stdout.reset()?;

    if let Err(e) = opener::open(url_to_open) {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
        writeln!(stdout, "Could not open browser automatically: {}", e)?;
        writeln!(stdout, "Please open the URL manually.")?;
        stdout.reset()?;
    }

    // Step 3: Poll for token
    let interval = Duration::from_secs(device_data.interval.unwrap_or(5) as u64);
    let mut polling_interval = interval;

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "Waiting for authorization...")?;
    stdout.reset()?;

    loop {
        sleep(polling_interval);

        let token_response = client
            .post(format!("{}/api/auth/device/token", api_url))
            .json(&serde_json::json!({
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "device_code": device_data.device_code,
                "client_id": "forklaunch-cli"
            }))
            .send()?;

        if token_response.status().is_success() {
            // Got session token from device auth - now exchange for JWT
            let response_body = token_response.text()?;

            let token_data: TokenResponse = serde_json::from_str(&response_body)?;
            let session_token = token_data.access_token;

            // Call /api/auth/token with session cookie to get JWT (same as browser)
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "Exchanging session for JWT...")?;
            stdout.reset()?;

            let jwt_url = format!("{}/api/auth/token", api_url);

            let jwt_response = client
                .get(&jwt_url)
                // Use Bearer auth with the session token (supported by bearer plugin)
                .bearer_auth(&session_token)
                .send()?;

            if !jwt_response.status().is_success() {
                let status = jwt_response.status();
                let body = jwt_response.text().unwrap_or_default();
                bail!("Failed to get JWT: {} - {}", status, body);
            }

            let jwt_body = jwt_response.text()?;

            #[derive(Deserialize)]
            struct JwtResponse {
                token: String,
                #[serde(rename = "expiresIn")]
                expires_in: Option<i64>,
            }

            let jwt_data: JwtResponse = serde_json::from_str(&jwt_body)?;
            let expires_at = chrono::Utc::now().timestamp() + jwt_data.expires_in.unwrap_or(604800);

            let token_storage = TokenData {
                access_token: jwt_data.token,
                refresh_token: session_token, // Use session token as refresh token
                expires_at,
            };

            // Save to ~/.forklaunch/token as TOML
            let token_path = get_token_path()?;
            if let Some(parent) = token_path.parent() {
                create_dir_all(parent)?;
            }

            let toml_content = toml::to_string(&token_storage)?;
            write(&token_path, toml_content)?;

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
            writeln!(stdout)?;
            writeln!(stdout, "Successfully logged in!")?;
            stdout.reset()?;

            return Ok(());
        } else {
            // Check error response
            let error_data: Result<TokenErrorResponse, _> = token_response.json();

            match error_data {
                Ok(error) => {
                    match error.error.as_str() {
                        "authorization_pending" => {
                            // Continue polling
                            continue;
                        }
                        "slow_down" => {
                            // Increase polling interval
                            polling_interval += Duration::from_secs(5);
                            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                            writeln!(
                                stdout,
                                "Slowing down polling to {}s",
                                polling_interval.as_secs()
                            )?;
                            stdout.reset()?;
                            continue;
                        }
                        "access_denied" => {
                            bail!("Access was denied by the user");
                        }
                        "expired_token" => {
                            bail!("The device code has expired. Please try again.");
                        }
                        _ => {
                            bail!("Error: {}", error.error_description.unwrap_or(error.error));
                        }
                    }
                }
                Err(_) => {
                    bail!("Failed to authenticate: unexpected response");
                }
            }
        }
    }
}

impl CliCommand for LoginCommand {
    fn command(&self) -> Command {
        command("login", "Login to the forklaunch platform")
    }

    fn handler(&self, _matches: &ArgMatches) -> Result<()> {
        login()
    }
}
