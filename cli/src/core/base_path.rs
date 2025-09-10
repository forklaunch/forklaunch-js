use std::{
    env::current_dir,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result, bail};
use clap::ArgMatches;
use walkdir::WalkDir;

use crate::constants::{ERROR_FAILED_TO_GET_CWD, ERROR_MANIFEST_NOT_FOUND};

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

fn find_in_modules_dirs(start_dir: &Path, file_name: &str) -> Option<PathBuf> {
    for entry in WalkDir::new(start_dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_dir() {
            let entry_path = entry.path();

            let module_path = entry_path.join("modules").join(file_name);
            if module_path.exists() {
                return Some(module_path);
            }
        }
    }
    None
}

pub(crate) fn find_app_root_path(matches: &ArgMatches) -> Result<(PathBuf, Option<String>)> {
    let current_dir = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;
    let relative_path = matches.get_one::<String>("base_path");

    let start_path = match relative_path {
        Some(relative_path) => {
            if current_dir.join(relative_path.clone()).exists() {
                current_dir.join(relative_path.clone())
            } else {
                let file_name = Path::new(relative_path)
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or(relative_path);

                find_in_modules_dirs(&current_dir, file_name).unwrap_or(current_dir.clone())
            }
        }
        None => current_dir.clone(),
    };

    println!("start_path: {}", start_path.display());
    let project_name = Some(
        start_path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string(),
    );

    let manifest_path = find_nearest_manifest_from(&start_path);

    match manifest_path {
        Some(manifest) => Ok((manifest, project_name)),
        None => bail!(ERROR_MANIFEST_NOT_FOUND),
    }
}
