#[cfg(unix)]
use std::os::unix::fs::symlink;
#[cfg(windows)]
use std::os::windows::fs::{symlink_dir, symlink_file};
use std::{env::current_dir, path::Path};

use anyhow::{Context, Result};
use pathdiff::diff_paths;
use ramhorns::Content;

use crate::{
    constants::{
        ERROR_FAILED_TO_GET_CWD, Formatter, Linter, TestFramework, error_failed_to_create_symlink,
    },
    core::manifest::ManifestConfig,
};

pub(crate) fn create_symlink_cross_platform<
    P: AsRef<std::path::Path>,
    Q: AsRef<std::path::Path>,
>(
    original: P,
    link: Q,
) -> std::io::Result<()> {
    #[cfg(unix)]
    {
        symlink(original, link)
    }
    #[cfg(windows)]
    {
        if original.as_ref().is_dir() {
            symlink_dir(original, link)
        } else {
            symlink_file(original, link)
        }
    }
}

fn create_symlink(
    file_name: &str,
    relative_path: &Path,
    current_path: &Path,
    dryrun: bool,
) -> Result<()> {
    if !dryrun {
        let source_path = relative_path.join(file_name);
        let target_path = current_path.join(file_name);
        create_symlink_cross_platform(source_path, target_path)
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
    base_path_dir: Option<&Path>,
    path_dir: &Path,
    manifest_data: &mut T,
    dryrun: bool,
) -> Result<()> {
    let current_path_dir = current_dir().context(ERROR_FAILED_TO_GET_CWD)?;
    let source_path = match base_path_dir {
        Some(base_path) => base_path,
        None => current_path_dir.as_path(),
    };

    let current_path = Path::new(path_dir);

    let relative_path =
        diff_paths(source_path, current_path).expect("Failed to compute relative path");

    match manifest_data.formatter().parse()? {
        Formatter::Prettier => {
            if !current_path.join(".prettierignore").exists() {
                create_symlink(".prettierignore", &relative_path, &current_path, dryrun)?;
            }

            if !current_path.join(".prettierrc").exists() {
                create_symlink(".prettierrc", &relative_path, &current_path, dryrun)?;
            }
        }
        Formatter::Biome => {
            if !current_path.join("biome.json").exists() {
                create_symlink("biome.json", &relative_path, &current_path, dryrun)?;
            }
        }
    }

    match manifest_data.linter().parse()? {
        Linter::Eslint => {
            if !current_path.join("eslint.config.mjs").exists() {
                create_symlink("eslint.config.mjs", &relative_path, &current_path, dryrun)?;
            }
        }
        Linter::Oxlint => {
            if !current_path.join(".oxlint.config.json").exists() {
                create_symlink(".oxlint.config.json", &relative_path, &current_path, dryrun)?;
            }
        }
    }

    match manifest_data.test_framework() {
        Some(test_framework) => match test_framework.parse()? {
            TestFramework::Vitest => {
                if !current_path.join("vitest.config.ts").exists() {
                    create_symlink("vitest.config.ts", &relative_path, &current_path, dryrun)?;
                }
            }
            TestFramework::Jest => {
                if !current_path.join("jest.config.ts").exists() {
                    create_symlink("jest.config.ts", &relative_path, &current_path, dryrun)?;
                }
            }
        },
        None => (),
    }

    Ok(())
}
