use std::{
    collections::{HashMap, hash_map::Drain},
    fs::{create_dir_all, write},
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use fs_extra::file::read_to_string;
use include_dir::{Dir, include_dir};
use termcolor::StandardStream;

use super::watermark::apply_watermark;
use crate::constants::ERROR_FAILED_TO_CREATE_DIR;

pub(crate) static TEMPLATES_DIR: Dir = include_dir!("src/templates");

#[derive(Debug, Clone)]
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

pub(crate) struct RenderedTemplatesCache {
    internal_cache: HashMap<String, RenderedTemplate>,
}

impl RenderedTemplatesCache {
    pub(crate)fn new() -> Self {
        Self {
            internal_cache: HashMap::new(),
        }
    }

    pub(crate)fn get<P: AsRef<Path>>(&self, key: P) -> Result<Option<RenderedTemplate>> {
        if self
            .internal_cache
            .contains_key(&key.as_ref().to_string_lossy().to_string())
        {
            Ok(Some(
                self.internal_cache
                    .get(&key.as_ref().to_string_lossy().to_string())
                    .unwrap()
                    .clone(),
            ))
        } else {
            read_to_string(&key).map_or(Ok(None), |content| {
                let template = RenderedTemplate {
                    path: key.as_ref().to_path_buf(),
                    content,
                    context: None,
                };
                Ok(Some(template))
            })
        }
    }

    pub(crate)fn insert<K: ToString>(&mut self, key: K, value: RenderedTemplate) {
        self.internal_cache.insert(key.to_string(), value);
    }

    pub(crate)fn drain(&mut self) -> Drain<'_, std::string::String, RenderedTemplate> {
        self.internal_cache.drain()
    }
}
