use std::{
    collections::HashMap,
    fs::{create_dir_all, write},
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use fs_extra::file::read_to_string;
use include_dir::{include_dir, Dir};
use termcolor::StandardStream;

use super::watermark::apply_watermark;
use crate::constants::ERROR_FAILED_TO_CREATE_DIR;

pub(crate) static TEMPLATES_DIR: Dir = include_dir!("src/templates");

#[derive(Clone)]
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

            write(
                &rendered_template.path,
                apply_watermark(&rendered_template)?,
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

struct RenderedTemplateCache {
    internal_cache: HashMap<String, RenderedTemplate>,
}

impl RenderedTemplateCache {
    pub fn new() -> Self {
        Self {
            internal_cache: HashMap::new(),
        }
    }

    pub fn get(&self, key: &str) -> Result<Option<RenderedTemplate>> {
        if self.internal_cache.contains_key(key) {
            Ok(Some(self.internal_cache.get(key).unwrap().clone()))
        } else {
            read_to_string(key).map_or(Ok(None), |content| {
                let template = RenderedTemplate {
                    path: PathBuf::from(key),
                    content,
                    context: None,
                };
                Ok(Some(template))
            })
        }
    }

    pub fn insert(&mut self, key: String, value: RenderedTemplate) {
        self.internal_cache.insert(key, value);
    }

    pub fn keys(&self) -> Vec<&String> {
        self.internal_cache.keys().collect()
    }

    pub fn values(&self) -> Vec<&RenderedTemplate> {
        self.internal_cache.values().collect()
    }

    pub fn values_mut(&mut self) -> Vec<&mut RenderedTemplate> {
        self.internal_cache.values_mut().collect()
    }
}
