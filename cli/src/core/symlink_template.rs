use std::{fs::exists, io::Write, os::unix::fs::symlink, path::PathBuf};

use anyhow::{Context, Result};
use termcolor::StandardStream;

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
                symlink(&symlink_template.path, &symlink_template.target).with_context(|| {
                    format!(
                        "Failed to symlink {} to {}",
                        symlink_template.path.display(),
                        symlink_template.target.display()
                    )
                })?;
            }
        } else {
            writeln!(
                stdout,
                "Would symlink {} to {}",
                symlink_template.path.display(),
                symlink_template.target.display()
            )?;
        }
    }
    Ok(())
}
