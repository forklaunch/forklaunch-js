use std::{
    fs::{exists, rename},
    io::Write,
    path::PathBuf,
};

use anyhow::{Context, Result};
use fs_extra::{
    dir::{self},
    file::{self},
};
use termcolor::StandardStream;

#[derive(Debug)]
pub(crate) enum MoveTemplateType {
    #[allow(dead_code)]
    File,
    Directory,
}

pub(crate) struct MoveTemplate {
    pub(crate) path: PathBuf,
    pub(crate) target: PathBuf,
    pub(crate) r#type: MoveTemplateType,
}

pub(crate) fn move_template_files(
    move_templates: &Vec<MoveTemplate>,
    dryrun: bool,
    stdout: &mut StandardStream,
) -> Result<()> {
    let mut file_copy_options = file::CopyOptions::new();
    file_copy_options.overwrite = false;
    let mut dir_copy_options = dir::CopyOptions::new();
    dir_copy_options.overwrite = false;
    dir_copy_options.copy_inside = true;
    dir_copy_options.content_only = false;

    for move_template in move_templates {
        if !dryrun {
            if exists(&move_template.path)? {
                match move_template.r#type {
                    MoveTemplateType::File => {
                        rename(&move_template.path, &move_template.target).with_context(|| {
                            format!("Failed to move {}", move_template.path.display())
                        })?;
                    }
                    MoveTemplateType::Directory => {
                        rename(&move_template.path, &move_template.target).with_context(|| {
                            format!("Failed to move {}", move_template.path.display())
                        })?;
                    }
                }
            }
        } else {
            writeln!(
                stdout,
                "Would move {} to {}",
                move_template.path.display(),
                move_template.target.display()
            )?;
        }
    }
    Ok(())
}
