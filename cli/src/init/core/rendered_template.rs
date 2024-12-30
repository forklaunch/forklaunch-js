use std::{
    fs::{create_dir_all, write},
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};

use crate::constants::ERROR_FAILED_TO_CREATE_DIR;

pub(crate) struct RenderedTemplate {
    pub(crate) path: PathBuf,
    pub(crate) content: String,
    pub(crate) context: Option<String>,
}

pub(crate) fn create_forklaunch_dir(path_dir: &String) -> Result<()> {
    let forklaunch_path = Path::new(path_dir).join(".forklaunch");
    create_dir_all(&forklaunch_path).with_context(|| ERROR_FAILED_TO_CREATE_DIR)?;
    Ok(())
}

pub(crate) fn write_rendered_templates(rendered_templates: &Vec<RenderedTemplate>) -> Result<()> {
    for rendered_template in rendered_templates {
        write(&rendered_template.path, rendered_template.content.clone()).with_context(|| {
            match &rendered_template.context {
                Some(context) => context.clone(),
                None => format!(
                    "Failed to write {}. Please check your target directory is writable",
                    rendered_template.path.display()
                ),
            }
        })?;
    }
    Ok(())
}
