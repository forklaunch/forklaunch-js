use std::fs::{read_to_string, write};
use std::path::Path;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string};

use super::config::{Config, ProjectConfig, ProjectEntry};

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct PnpmWorkspace {
    packages: Vec<String>,
}

pub(crate) fn generate_pnpm_workspace(
    app_name: &str,
    additional_projects: &Vec<ProjectEntry>,
) -> Result<()> {
    let pnpm_workspace_path = Path::new(app_name).join("pnpm-workspace.yaml");
    if !pnpm_workspace_path.exists() {
        write(
            pnpm_workspace_path,
            to_string(&PnpmWorkspace {
                packages: additional_projects.iter().map(|p| p.name.clone()).collect(),
            })?,
        )?;
    }
    Ok(())
}

pub(crate) fn add_project_definition_to_pnpm_workspace<T: Config + ProjectConfig + Serialize>(
    base_path: &str,
    config_data: &T,
) -> Result<String> {
    let pnpm_workspace_path = Path::new(base_path).join("pnpm-workspace.yaml");
    let pnpm_workspace_content = read_to_string(&pnpm_workspace_path)?;
    let mut pnpm_workspace: PnpmWorkspace = from_str(&pnpm_workspace_content)?;
    if !pnpm_workspace.packages.contains(&config_data.name()) {
        pnpm_workspace.packages.push(config_data.name().clone());
    }
    Ok(to_string(&pnpm_workspace)?)
}
