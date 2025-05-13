use std::{fs::exists, io::Write, os::unix::fs::symlink, path::PathBuf};

use anyhow::{Context, Result};
use termcolor::StandardStream;

#[derive(Debug)]
pub(crate) struct SymlinkTemplate {
    pub(crate) path: PathBuf,
    pub(crate) target: PathBuf,
}

pub(crate) fn create_symlinks(
    symlink_templates: &Vec<SymlinkTemplate>,
    dryrun: bool,
    stdout: &mut StandardStream,
) -> Result<()> {
    for symlink_template in symlink_templates {
        if !dryrun {
            if !exists(&symlink_template.target)? {
                let relative_path = pathdiff::diff_paths(
                    &symlink_template.path,
                    &symlink_template.target.parent().unwrap(),
                )
                .expect("Failed to compute relative path");
                symlink(relative_path.clone(), &symlink_template.target).with_context(|| {
                    format!(
                        "Failed to symlink {} to {}",
                        relative_path.display(),
                        symlink_template.target.display()
                    )
                })?;
            }
        } else {
            let relative_path = pathdiff::diff_paths(
                &symlink_template.path,
                &symlink_template.target.parent().unwrap(),
            )
            .expect("Failed to compute relative path");
            writeln!(
                stdout,
                "Would symlink {} to {}",
                relative_path.display(),
                symlink_template.target.display()
            )?;
        }
    }
    Ok(())
}
