use std::{env::current_dir, os::unix::fs::symlink, path::Path};

use anyhow::{Context, Result};
use pathdiff::diff_paths;
use ramhorns::Content;

use crate::constants::{error_failed_to_create_symlink, ERROR_FAILED_TO_GET_CWD};

use crate::core::manifest::ManifestConfig;

fn create_symlink(
    file_name: &str,
    relative_path: &Path,
    current_path: &Path,
    dryrun: bool,
) -> Result<()> {
    if !dryrun {
        symlink(relative_path.join(file_name), current_path.join(file_name))
            .with_context(|| error_failed_to_create_symlink(&current_path.join(file_name)))?;
    } else {
        println!(
            "Would create symlink from {} to {}",
            relative_path.join(file_name).display(),
            current_path.join(file_name).display()
        );
    }
    Ok(())
}

pub(crate) fn generate_symlinks<T: Content + ManifestConfig>(
    base_path_dir: Option<&String>,
    path_dir: &String,
    config_data: &mut T,
    dryrun: bool,
) -> Result<()> {
    let current_path_dir = current_dir().context(ERROR_FAILED_TO_GET_CWD)?;
    let source_path = match base_path_dir {
        Some(base_path) => Path::new(base_path),
        None => current_path_dir.as_path(),
    };

    let current_path = Path::new(path_dir);

    let relative_path =
        diff_paths(source_path, current_path).expect("Failed to compute relative path");

    if !current_path.join(".prettierignore").exists() {
        create_symlink(".prettierignore", &relative_path, &current_path, dryrun)?;
    }

    if !current_path.join(".prettierrc").exists() {
        create_symlink(".prettierrc", &relative_path, &current_path, dryrun)?;
    }

    if !current_path.join("eslint.config.mjs").exists() {
        create_symlink("eslint.config.mjs", &relative_path, &current_path, dryrun)?;
    }

    match config_data.test_framework().as_str() {
        "vitest" => {
            if !current_path.join("vitest.config.ts").exists() {
                create_symlink("vitest.config.ts", &relative_path, &current_path, dryrun)?;
            }
        }
        "jest" => {
            if !current_path.join("jest.config.ts").exists() {
                create_symlink("jest.config.ts", &relative_path, &current_path, dryrun)?;
            }
        }
        _ => (),
    }

    Ok(())
}
