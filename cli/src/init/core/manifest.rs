use std::path::Path;

use anyhow::{Context, Result};
use serde::Serialize;
use toml::to_string_pretty;

use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST, ERROR_FAILED_TO_CREATE_MANIFEST,
    },
    core::manifest::{ManifestConfig, ProjectEntry, ProjectManifestConfig},
    init::application::ApplicationManifestData,
};

use super::rendered_template::RenderedTemplate;

pub(crate) fn generate_manifest(
    path_dir: &String,
    data: &ApplicationManifestData,
) -> Result<Option<RenderedTemplate>> {
    let config_str = to_string_pretty(&data).with_context(|| ERROR_FAILED_TO_CREATE_MANIFEST)?;
    let config_path = Path::new(path_dir)
        .join(".forklaunch")
        .join("manifest.toml");

    if config_path.exists() {
        return Ok(None);
    }
    Ok(Some(RenderedTemplate {
        path: config_path,
        content: config_str,
        context: None,
    }))
}

pub(crate) fn add_project_definition_to_manifest<
    T: ManifestConfig + ProjectManifestConfig + Serialize,
>(
    config_data: &mut T,
    port: Option<i32>,
    database: Option<String>,
) -> Result<String> {
    let name = config_data.name().to_owned();
    for project in config_data.projects().iter() {
        if project.name == name {
            return Ok(to_string_pretty(&config_data)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?);
        }
    }

    config_data.projects_mut().push(ProjectEntry {
        name: name.clone(),
        port,
        database,
    });

    let app_name = config_data.app_name().to_owned();
    config_data
        .project_peer_topology_mut()
        .entry(app_name)
        .or_insert_with(Vec::new)
        .push(name.clone());

    Ok(to_string_pretty(&config_data)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?)
}
