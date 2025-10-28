use std::process::Command;

use anyhow::{Context, Result};

/// Get the current git commit SHA
pub(crate) fn get_git_commit() -> Result<String> {
    let output = Command::new("git")
        .args(&["rev-parse", "HEAD"])
        .output()
        .with_context(|| "Failed to execute git command. Is git installed?")?;

    if !output.status.success() {
        anyhow::bail!(
            "Failed to get git commit: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    let commit = String::from_utf8(output.stdout)
        .with_context(|| "Invalid UTF-8 in git output")?
        .trim()
        .to_string();

    Ok(commit)
}

/// Get the current git branch name
pub(crate) fn get_git_branch() -> Result<String> {
    let output = Command::new("git")
        .args(&["branch", "--show-current"])
        .output()
        .with_context(|| "Failed to execute git command")?;

    if !output.status.success() {
        let output = Command::new("git")
            .args(&["rev-parse", "--abbrev-ref", "HEAD"])
            .output()
            .with_context(|| "Failed to get git branch")?;

        if !output.status.success() {
            return Ok("unknown".to_string());
        }

        let branch = String::from_utf8(output.stdout)
            .with_context(|| "Invalid UTF-8 in git output")?
            .trim()
            .to_string();

        return Ok(branch);
    }

    let branch = String::from_utf8(output.stdout)
        .with_context(|| "Invalid UTF-8 in git output")?
        .trim()
        .to_string();

    Ok(branch)
}

pub(crate) fn is_git_repo() -> bool {
    Command::new("git")
        .args(&["rev-parse", "--git-dir"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
