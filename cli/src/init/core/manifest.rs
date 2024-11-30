use std::{
    fs::{create_dir_all, write},
    path::Path,
};

use anyhow::Result;
use ramhorns::Content;
use serde::Serialize;
use toml::to_string_pretty;

use crate::init::service::ServiceConfigData;

use super::config::{Config, ProjectEntry};

pub(crate) fn setup_manifest<T: Content + Config + Serialize>(
    path_dir: &String,
    data: &T,
) -> Result<()> {
    let config_str = to_string_pretty(&data)?;
    let forklaunch_path = Path::new(path_dir).join(".forklaunch");

    if !forklaunch_path.exists() {
        create_dir_all(&forklaunch_path)?;
    }

    let config_path = forklaunch_path.join("config.toml");
    if !config_path.exists() {
        write(config_path, config_str)?;
    }
    Ok(())
}

pub(crate) fn add_service_definition_to_manifest(
    config_data: &mut ServiceConfigData,
    port_number: i32,
) -> Result<String> {
    for project in config_data.projects.iter() {
        if project.name == config_data.service_name {
            return Ok(to_string_pretty(&config_data)?);
        }
    }

    config_data.projects.push(ProjectEntry {
        name: config_data.service_name.clone(),
        port: Some(port_number),
    });

    Ok(to_string_pretty(&config_data)?)
}
