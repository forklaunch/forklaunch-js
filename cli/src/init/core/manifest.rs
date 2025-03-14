use std::path::Path;

use anyhow::{Context, Result};
use serde::Serialize;
use toml::to_string_pretty;

use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST,
        ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST, ERROR_FAILED_TO_CREATE_MANIFEST,
    },
    core::manifest::{
        ManifestConfig, ProjectEntry, ProjectManifestConfig, ProjectType, ResourceInventory,
    },
    init::{application::ApplicationManifestData, router::RouterManifestData},
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
    r#type: ProjectType,
    config_data: &mut T,
    resources: Option<ResourceInventory>,
    routers: Option<Vec<String>>,
) -> Result<String> {
    let name = config_data.name().to_owned();
    for project in config_data.projects().iter() {
        if project.name == name {
            return Ok(to_string_pretty(&config_data)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST)?);
        }
    }

    config_data.projects_mut().push(ProjectEntry {
        r#type,
        name: name.clone(),
        resources,
        routers,
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

pub(crate) fn add_router_definition_to_manifest(
    config_data: &mut RouterManifestData,
    serivce_name: &String,
) -> Result<(ProjectType, String)> {
    let name = config_data.router_name.clone();
    for project in config_data.projects().iter() {
        if let Some(routers) = &project.routers {
            for router in routers.iter() {
                if router == &name {
                    return Ok((
                        project.r#type.clone(),
                        to_string_pretty(&config_data)
                            .with_context(|| ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST)?,
                    ));
                }
            }
        }
    }

    let project = config_data
        .projects_mut()
        .iter_mut()
        .find(|project| &project.name == serivce_name)
        .unwrap();

    if project.routers == None {
        project.routers = Some(vec![])
    }

    project.routers.as_mut().unwrap().push(name);

    Ok((
        project.r#type.clone(),
        to_string_pretty(&config_data)
            .with_context(|| ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST)?,
    ))
}
