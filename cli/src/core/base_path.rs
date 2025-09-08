use std::{
    env::current_dir,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use clap::ArgMatches;
use rustyline::{Editor, history::DefaultHistory};
use termcolor::StandardStream;

use crate::{
    constants::ERROR_FAILED_TO_GET_CWD,
    core::flexible_path::{PathSearchConfig, find_manifest_path},
    prompt::{ArrayCompleter, prompt_with_validation},
};

pub(crate) enum BasePathType {
    Init,
    #[allow(dead_code)]
    Change,
    #[allow(dead_code)]
    Delete,
    Eject,
    #[allow(dead_code)]
    Depcheck,
}

#[derive(PartialEq)]
pub(crate) enum BasePathLocation {
    Application,
    Service,
    Worker,
    #[allow(dead_code)]
    Router,
    #[allow(dead_code)]
    Anywhere,
    Library,
    DeferToType,
}

fn base_path_parent_count(
    base_path_location: &BasePathLocation,
    base_path_type: &BasePathType,
) -> i32 {
    let count = match base_path_location {
        BasePathLocation::Application => -1,
        BasePathLocation::Service => 0,
        BasePathLocation::Worker => 0,
        BasePathLocation::Library => 0,
        BasePathLocation::DeferToType => 0,
        BasePathLocation::Router => 1,
        BasePathLocation::Anywhere => 2,
    } + match base_path_type {
        BasePathType::Init => 0,
        BasePathType::Change => 1,
        BasePathType::Delete => 0,
        BasePathType::Eject => 1,
        BasePathType::Depcheck => 0,
    };
    count
}

fn check_base_path(
    base_path: &PathBuf,
    base_path_location: &BasePathLocation,
    base_path_type: &BasePathType,
) -> bool {
    let base_path_parent_count = base_path_parent_count(base_path_location, base_path_type);
    let mut base_path_to_test = base_path.to_path_buf();
    for _ in 0..base_path_parent_count {
        base_path_to_test = base_path_to_test.parent().unwrap().to_path_buf();
    }

    if base_path_to_test
        .join(".forklaunch")
        .join("manifest.toml")
        .exists()
    {
        true
    } else {
        false
    }
}

fn find_base_path(
    base_path_location: &BasePathLocation,
    base_path_type: &BasePathType,
) -> Option<PathBuf> {
    let mut base_path = current_dir().unwrap().to_path_buf();
    for _ in 0..base_path_parent_count(base_path_location, base_path_type) {
        if base_path.join(".forklaunch").join("manifest.toml").exists() {
            return Some(base_path);
        }
        base_path = base_path.parent().unwrap().to_path_buf();
    }
    None
}

pub(crate) fn find_nearest_manifest_from(start: &Path) -> Option<PathBuf> {
    let mut base_path = start.canonicalize().ok()?;
    loop {
        let manifest = base_path.join(".forklaunch").join("manifest.toml");
        if manifest.exists() {
            return Some(base_path.clone());
        }
        match base_path.parent() {
            Some(parent) => base_path = parent.to_path_buf(),
            None => break,
        }
    }
    None
}

pub(crate) fn find_nearest_manifest_root_unbounded() -> Option<PathBuf> {
    let mut base_path = current_dir().ok()?;
    loop {
        let manifest = base_path.join(".forklaunch").join("manifest.toml");
        if manifest.exists() {
            return Some(base_path);
        }
        match base_path.parent() {
            Some(parent) => base_path = parent.to_path_buf(),
            None => break,
        }
    }
    None
}

pub(crate) fn prompt_base_path(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
    base_path_location: &BasePathLocation,
    base_path_type: &BasePathType,
) -> Result<String> {
    let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;

    let maybe_defined_base_path = matches.get_one::<String>("base_path");
    let base_path = if let Some(base_path) = maybe_defined_base_path {
        base_path.to_string()
    } else {
        let maybe_correct_path = match base_path_location {
            BasePathLocation::Anywhere => {
                if let Some(base_path) = find_base_path(base_path_location, base_path_type) {
                    Some(base_path.to_string_lossy().to_string())
                } else {
                    None
                }
            }
            _ => {
                if check_base_path(&current_path, base_path_location, base_path_type) {
                    Some(current_path.to_string_lossy().to_string())
                } else {
                    None
                }
            }
        };

        if let Some(base_path) = maybe_correct_path {
            base_path
        } else {
            prompt_with_validation(
                line_editor,
                stdout,
                "base_path",
                matches,
                "base path (optional, press enter for current directory)",
                None,
                |input: &str| {
                    let base_path = if input.trim().is_empty() {
                        &current_path
                    } else {
                        &Path::new(input).to_path_buf()
                    };
                    check_base_path(base_path, base_path_location, base_path_type)
                },
                |_| "Base path is not correct. Please try again".to_string(),
            )?
        }
    };

    Ok(Path::new(&base_path)
        .canonicalize()
        .unwrap()
        .to_string_lossy()
        .to_string())
}

pub(crate) fn resolve_app_base_path_and_find_manifest(
    matches: &ArgMatches,
    config: &PathSearchConfig,
) -> Result<PathBuf> {
    let current_dir = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;

    let app_base_path = if let Some(relative_path) = matches.get_one::<String>("base_path") {
        current_dir.join(relative_path)
    } else {
        current_dir
    };

    let manifest_path = find_manifest_path(&app_base_path, config);

    match manifest_path {
        Some(manifest) => Ok(manifest),
        None => anyhow::bail!(
            "Could not find .forklaunch/manifest.toml. Make sure you're in a valid project directory or specify the correct base_path."
        ),
    }
}
