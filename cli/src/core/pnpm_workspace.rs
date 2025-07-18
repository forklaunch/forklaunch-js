use std::{fs::read_to_string, path::Path};

use anyhow::{Context, Ok, Result};
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string};

use super::{manifest::InitializableManifestConfig, rendered_template::RenderedTemplate};
use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE,
        ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE, ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE,
        ERROR_FAILED_TO_READ_PNPM_WORKSPACE,
    },
    core::manifest::{ManifestConfig, ProjectEntry, ProjectManifestConfig},
};

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct PnpmWorkspace {
    pub(crate) packages: Vec<String>,
}

pub(crate) fn generate_pnpm_workspace(
    app_name: &str,
    additional_projects: &Vec<ProjectEntry>,
) -> Result<Option<RenderedTemplate>> {
    let pnpm_workspace_path = Path::new(app_name).join("pnpm-workspace.yaml");
    if pnpm_workspace_path.exists() {
        return Ok(None);
    }

    Ok(Some(RenderedTemplate {
        path: pnpm_workspace_path,
        content: to_string(&PnpmWorkspace {
            packages: additional_projects.iter().map(|p| p.name.clone()).collect(),
        })
        .with_context(|| ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE)?,
        context: None,
    }))
}

pub(crate) fn add_project_definition_to_pnpm_workspace<
    T: ManifestConfig + ProjectManifestConfig + InitializableManifestConfig + Serialize,
>(
    base_path: &Path,
    manifest_data: &T,
) -> Result<String> {
    let pnpm_workspace_path = base_path.join("pnpm-workspace.yaml");
    let mut pnpm_workspace: PnpmWorkspace = from_str(
        &read_to_string(&pnpm_workspace_path)
            .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?;
    if !pnpm_workspace.packages.contains(&manifest_data.name()) {
        pnpm_workspace.packages.push(manifest_data.name().clone());
    }
    Ok(to_string(&pnpm_workspace)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?)
}

pub(crate) fn remove_project_definition_to_pnpm_workspace(
    base_path: &Path,
    project_name: &str,
) -> Result<String> {
    let pnpm_workspace_path = base_path.join("pnpm-workspace.yaml");
    let mut pnpm_workspace: PnpmWorkspace = from_str(
        &read_to_string(&pnpm_workspace_path)
            .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?;
    if let Some(position) = pnpm_workspace
        .packages
        .iter()
        .position(|name| name == project_name)
    {
        pnpm_workspace.packages.remove(position);
    }
    Ok(to_string(&pnpm_workspace)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?)
}
