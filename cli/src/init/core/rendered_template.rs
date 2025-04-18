use std::{
    fs::{create_dir_all, write},
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use termcolor::StandardStream;

use crate::constants::ERROR_FAILED_TO_CREATE_DIR;

use super::watermark::generate_watermark;

pub(crate) struct RenderedTemplate {
    pub(crate) path: PathBuf,
    pub(crate) content: String,
    pub(crate) context: Option<String>,
}

pub(crate) fn create_forklaunch_dir(path_dir: &String, dryrun: bool) -> Result<()> {
    if !dryrun {
        let forklaunch_path = Path::new(path_dir).join(".forklaunch");
        create_dir_all(&forklaunch_path).with_context(|| ERROR_FAILED_TO_CREATE_DIR)?;
    }
    Ok(())
}

pub(crate) fn write_rendered_templates(
    rendered_templates: &Vec<RenderedTemplate>,
    dryrun: bool,
    stdout: &mut StandardStream,
) -> Result<()> {
    for rendered_template in rendered_templates {
        if !dryrun {
            create_dir_all(&rendered_template.path.parent().unwrap()).with_context(|| {
                format!(
                    "Failed to create parent directory for {}",
                    rendered_template.path.display()
                )
            })?;
            let maybe_watermark = generate_watermark(
                &rendered_template
                    .path
                    .file_name()
                    .unwrap()
                    .to_str()
                    .unwrap(),
            );
            let watermark = maybe_watermark.clone().unwrap_or(String::new());
            write(
                &rendered_template.path,
                format!(
                    "{}{}",
                    if maybe_watermark.is_some()
                        && rendered_template
                            .content
                            .contains("Generated by ForkLaunch")
                        && rendered_template.content.contains("File:")
                        && rendered_template
                            .content
                            .contains("Modifications are encouraged")
                    {
                        ""
                    } else {
                        &watermark
                    },
                    rendered_template.content.clone(),
                ),
            )
            .with_context(|| match &rendered_template.context {
                Some(context) => context.clone(),
                None => format!(
                    "Failed to write {}. Please check your target directory is writable",
                    rendered_template.path.display()
                ),
            })?;
        } else {
            writeln!(stdout, "Would write {}", rendered_template.path.display())?;
        }
    }
    Ok(())
}
