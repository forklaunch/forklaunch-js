use std::{env::current_dir, os::unix::fs::symlink, path::Path};

use anyhow::Result;
use pathdiff::diff_paths;
use ramhorns::Content;

use super::config::Config;

pub(crate) fn setup_symlinks<T: Content + Config>(
    base_path_dir: Option<&String>,
    path_dir: &String,
    config_data: &mut T,
) -> Result<()> {
    let current_path_dir = current_dir()?;
    let source_path = match base_path_dir {
        Some(base_path) => Path::new(base_path),
        None => current_path_dir.as_path(),
    };

    let current_path = Path::new(path_dir);

    let relative_path =
        diff_paths(source_path, current_path).expect("Failed to compute relative path");

    if !current_path.join(".prettierignore").exists() {
        symlink(
            relative_path.join(".prettierignore"),
            current_path.join(".prettierignore"),
        )?;
    }

    if !current_path.join(".prettierrc").exists() {
        symlink(
            relative_path.join(".prettierrc"),
            current_path.join(".prettierrc"),
        )?;
    }

    if !current_path.join("eslint.config.mjs").exists() {
        symlink(
            relative_path.join("eslint.config.mjs"),
            current_path.join("eslint.config.mjs"),
        )?;
    }

    match config_data.test_framework().as_str() {
        "vitest" => {
            if !current_path.join("vitest.config.ts").exists() {
                symlink(
                    relative_path.join("vitest.config.ts"),
                    current_path.join("vitest.config.ts"),
                )?
            }
        }
        "jest" => {
            if !current_path.join("jest.config.ts").exists() {
                symlink(
                    relative_path.join("jest.config.ts"),
                    current_path.join("jest.config.ts"),
                )?
            }
        }
        _ => (),
    }

    Ok(())
}
