use std::fs::{read_to_string, write};
use std::path::Path;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string};

use crate::constants::{
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE, ERROR_FAILED_TO_CREATE_PNPM_WORKSPACE,
    ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE, ERROR_FAILED_TO_READ_PNPM_WORKSPACE,
};

use super::config::{Config, ProjectConfig, ProjectEntry};

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct PnpmWorkspace {
    packages: Vec<String>,
}

pub(crate) fn generate_pnpm_workspace(
    app_name: &str,
    additional_projects: &Vec<ProjectEntry>,
) -> Result<()> {
    let pnpm_workspace_path = Path::new(app_name).join("pnpm-workspace.yml");
    if !pnpm_workspace_path.exists() {
        write(
            pnpm_workspace_path,
            to_string(&PnpmWorkspace {
                packages: additional_projects.iter().map(|p| p.name.clone()).collect(),
            })
            .with_context(|| ERROR_FAILED_TO_CREATE_PNPM_WORKSPACE)?,
        )?;
    }
    Ok(())
}

pub(crate) fn add_project_definition_to_pnpm_workspace<T: Config + ProjectConfig + Serialize>(
    base_path: &str,
    config_data: &T,
) -> Result<String> {
    let pnpm_workspace_path = Path::new(base_path).join("pnpm-workspace.yml");
    let mut pnpm_workspace: PnpmWorkspace = from_str(
        &read_to_string(&pnpm_workspace_path)
            .with_context(|| ERROR_FAILED_TO_READ_PNPM_WORKSPACE)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE)?;
    if !pnpm_workspace.packages.contains(&config_data.name()) {
        pnpm_workspace.packages.push(config_data.name().clone());
    }
    Ok(to_string(&pnpm_workspace)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE)?)
}
