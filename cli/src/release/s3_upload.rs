use std::{fs::File, path::Path};

use anyhow::{Context, Result, bail};
use flate2::{Compression, write::GzEncoder};
use ignore::WalkBuilder;
use reqwest::blocking::Client;
use serde::Deserialize;
use tar::Builder;

use crate::{constants::get_api_url, core::token::get_token};

#[derive(Debug, Deserialize)]
pub(crate) struct UploadUrlResponse {
    #[serde(rename = "uploadUrl")]
    pub upload_url: String,
    #[serde(rename = "codeSourceUrl")]
    pub code_source_url: String,
}

/// Create a tarball of the application directory, respecting .gitignore
pub(crate) fn create_app_tarball(app_root: &Path, output_path: &Path) -> Result<()> {
    let tar_gz = File::create(output_path)
        .with_context(|| format!("Failed to create tarball file at {:?}", output_path))?;
    let enc = GzEncoder::new(tar_gz, Compression::default());
    let mut tar = Builder::new(enc);

    // Use the 'ignore' crate to walk the directory respecting .gitignore
    // This also handles nested .gitignore files and .git/info/exclude
    let walker = WalkBuilder::new(app_root)
        .hidden(false) // Include hidden files (except those in .gitignore)
        .git_ignore(true) // Respect .gitignore
        .git_global(true) // Respect global gitignore
        .git_exclude(true) // Respect .git/info/exclude
        .require_git(false) // Works even without a .git directory
        .build();

    let mut file_count = 0;
    for entry in walker {
        let entry = entry.with_context(|| "Failed to read directory entry")?;
        let path = entry.path();

        // Skip the .git directory itself
        if path.starts_with(app_root.join(".git")) {
            continue;
        }

        // Skip the tarball output file if it's in the same directory
        if path == output_path {
            continue;
        }

        if path.is_file() {
            let relative_path = path
                .strip_prefix(app_root)
                .with_context(|| format!("Failed to get relative path for {:?}", path))?;

            tar.append_path_with_name(path, relative_path)
                .with_context(|| format!("Failed to add {:?} to tarball", relative_path))?;

            file_count += 1;
        }
    }

    tar.finish().with_context(|| "Failed to finalize tarball")?;

    if file_count == 0 {
        bail!("No files found to package. Check your .gitignore settings.");
    }

    Ok(())
}

/// Get presigned upload URL from platform
pub(crate) fn get_presigned_upload_url(
    application_id: &str,
    version: &str,
) -> Result<UploadUrlResponse> {
    let token = get_token()?;
    let url = format!("{}/releases/upload-url", get_api_url());
    let client = Client::new();

    let request_body = serde_json::json!({
        "applicationId": application_id,
        "version": version
    });

    let response = client
        .post(&url)
        .bearer_auth(&token)
        .json(&request_body)
        .send()
        .with_context(|| "Failed to request upload URL from platform")?;

    let status = response.status();
    if !status.is_success() {
        let error_body = response
            .text()
            .unwrap_or_else(|_| "Unknown error".to_string());
        bail!(
            "Failed to get upload URL: {} (Status: {})",
            error_body,
            status
        );
    }

    response
        .json::<UploadUrlResponse>()
        .with_context(|| "Failed to parse upload URL response")
}

/// Upload tarball to S3 using presigned URL
pub(crate) fn upload_to_s3(file_path: &Path, presigned_url: &str) -> Result<()> {
    let client = Client::new();
    let file_content = std::fs::read(file_path)
        .with_context(|| format!("Failed to read tarball file {:?}", file_path))?;

    let file_size = file_content.len();

    let response = client
        .put(presigned_url)
        .body(file_content)
        .header("Content-Type", "application/gzip")
        .send()
        .with_context(|| "Failed to upload tarball to S3")?;

    let status = response.status();
    if !status.is_success() {
        let error_body = response
            .text()
            .unwrap_or_else(|_| "Unknown error".to_string());
        bail!(
            "Failed to upload to S3: {} (Status: {})",
            error_body,
            status
        );
    }

    println!("[INFO] Uploaded {} bytes to S3", file_size);
    Ok(())
}
