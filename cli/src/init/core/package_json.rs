use std::{fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use ramhorns::{Content, Template};
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string_pretty, to_value, Value};

use crate::constants::{
    ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON, ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
    ERROR_FAILED_TO_READ_PACKAGE_JSON,
};

use super::config::{Config, ProjectConfig};

#[derive(Debug, Serialize, Deserialize)]
struct PackageJson {
    #[serde(default)]
    workspaces: Option<Vec<String>>,
}

pub(crate) fn add_project_definition_to_package_json<
    T: Content + Config + ProjectConfig + Serialize,
>(
    config_data: &T,
    base_path: &String,
) -> Result<String> {
    let mut full_package_json: Value = from_str(
        &read_to_string(Path::new(base_path).join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;
    let mut package_json: PackageJson = Deserialize::deserialize(&full_package_json)
        .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    if let Some(workspaces) = &mut package_json.workspaces {
        if !workspaces.contains(&config_data.name()) {
            workspaces.push(config_data.name().clone());
            full_package_json["workspaces"] = to_value(workspaces)
                .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?;
        }
    }

    Ok(Template::new(
        to_string_pretty(&full_package_json)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON)?
            .as_str(),
    )?
    .render(&config_data))
}
