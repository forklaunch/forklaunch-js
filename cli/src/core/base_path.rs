use std::{
    env::current_dir,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use clap::ArgMatches;
use rustyline::{history::DefaultHistory, Editor};
use termcolor::StandardStream;

use crate::{
    constants::ERROR_FAILED_TO_GET_CWD,
    prompt::{prompt_with_validation, ArrayCompleter},
};

#[derive(PartialEq)]
pub(crate) enum BasePathLocation {
    Service,
    //Worker,
    Router,
    Anywhere,
    Library,
}

fn base_path_parent_count(base_path_location: &BasePathLocation) -> usize {
    match base_path_location {
        BasePathLocation::Service => 0,
        // BasePathLocation::Worker => 1,
        BasePathLocation::Library => 0,
        BasePathLocation::Router => 1,
        BasePathLocation::Anywhere => 2,
    }
}

fn check_base_path(base_path: &PathBuf, base_path_location: &BasePathLocation) -> bool {
    let base_path_parent_count = base_path_parent_count(base_path_location);
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

fn find_base_path(base_path_location: &BasePathLocation) -> Option<PathBuf> {
    let mut base_path = current_dir().unwrap().to_path_buf();
    for _ in 0..base_path_parent_count(base_path_location) {
        base_path = base_path.parent().unwrap().to_path_buf();
        if base_path.join(".forklaunch").join("manifest.toml").exists() {
            return Some(base_path);
        }
    }
    None
}

pub(crate) fn prompt_base_path(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
    base_path_location: &BasePathLocation,
) -> Result<String> {
    let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;

    let base_path = if base_path_location == &BasePathLocation::Anywhere {
        find_base_path(base_path_location)
            .unwrap()
            .to_string_lossy()
            .to_string()
    } else {
        if check_base_path(&current_path, base_path_location) {
            current_path.to_string_lossy().to_string()
        } else {
            prompt_with_validation(
                line_editor,
                stdout,
                "base_path",
                matches,
                "Enter base path (optional, press enter for current directory): ",
                None,
                |input: &str| {
                    let base_path = if input.trim().is_empty() {
                        &current_path
                    } else {
                        &Path::new(input).to_path_buf()
                    };
                    check_base_path(base_path, base_path_location)
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
