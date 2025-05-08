use std::{
    fs::{exists, remove_dir_all, remove_file},
    io::Write,
    path::PathBuf,
};

use anyhow::{Context, Result};
use termcolor::StandardStream;

#[derive(Debug)]
pub(crate) enum RemovalTemplateType {
    File,
    Directory,
}

pub(crate) struct RemovalTemplate {
    pub(crate) path: PathBuf,
    pub(crate) r#type: RemovalTemplateType,
}

pub(crate) fn remove_template_files(
    removal_templates: &Vec<RemovalTemplate>,
    dryrun: bool,
    stdout: &mut StandardStream,
) -> Result<()> {
    for removal_template in removal_templates {
        if !dryrun {
            if exists(&removal_template.path)? {
                match removal_template.r#type {
                    RemovalTemplateType::File => {
                        remove_file(&removal_template.path).with_context(|| {
                            format!("Failed to remove {}", removal_template.path.display())
                        })?;
                    }
                    RemovalTemplateType::Directory => {
                        remove_dir_all(&removal_template.path).with_context(|| {
                            format!("Failed to remove {}", removal_template.path.display())
                        })?;
                    }
                }
            }
        } else {
            writeln!(stdout, "Would remove {}", removal_template.path.display())?;
        }
    }
    Ok(())
}
