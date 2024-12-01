use std::{
    fs::{create_dir_all, write},
    path::Path,
};

use anyhow::{Context, Result};
use ramhorns::Content;
use serde::Serialize;
use toml::to_string_pretty;

use crate::constants::{ERROR_FAILED_TO_CREATE_DIR, ERROR_FAILED_TO_WRITE_FILE};

use super::config::{Config, ProjectConfig, ProjectEntry};

pub(crate) fn setup_manifest<T: Content + Config + Serialize>(
    path_dir: &String,
    data: &T,
) -> Result<()> {
    let config_str = to_string_pretty(&data)?;
    let forklaunch_path = Path::new(path_dir).join(".forklaunch");

    if !forklaunch_path.exists() {
        create_dir_all(&forklaunch_path).with_context(|| ERROR_FAILED_TO_CREATE_DIR)?;
    }

    let config_path = forklaunch_path.join("manifest.toml");
    if !config_path.exists() {
        write(config_path, config_str).with_context(|| ERROR_FAILED_TO_WRITE_FILE)?;
    }
    Ok(())
}

pub(crate) fn add_project_definition_to_manifest<T: Config + ProjectConfig + Serialize>(
    config_data: &mut T,
    port: Option<i32>,
) -> Result<String> {
    let name = config_data.name().to_owned();
    for project in config_data.projects().iter() {
        if project.name == name {
            return Ok(to_string_pretty(&config_data)?);
        }
    }

    config_data.projects_mut().push(ProjectEntry {
        name: name.clone(),
        port,
    });

    let app_name = config_data.app_name().to_owned();
    config_data
        .project_peer_topology_mut()
        .entry(app_name)
        .or_insert_with(Vec::new)
        .push(name.clone());

    Ok(to_string_pretty(&config_data)?)
}
