use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use ramhorns::Template;
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string_pretty, to_value, Value};

use crate::init::service::ServiceConfigData;

use super::config::{Config, ProjectConfig};

#[derive(Debug, Serialize, Deserialize)]
struct PackageJson {
    #[serde(default)]
    workspaces: Option<Vec<String>>,
}

pub(crate) fn add_project_definition_to_package_json<T: Config + ProjectConfig + Serialize>(
    config_data: &T,
    base_path: &String,
) -> Result<String> {
    let mut full_package_json: Value =
        from_str(&read_to_string(Path::new(base_path).join("package.json"))?)?;
    let mut package_json: PackageJson = Deserialize::deserialize(&full_package_json)?;

    if let Some(workspaces) = &mut package_json.workspaces {
        if !workspaces.contains(&config_data.service_name) {
            workspaces.push(config_data.service_name.clone());
            full_package_json["workspaces"] = to_value(workspaces)?;
        }
    }

    Ok(Template::new(to_string_pretty(&full_package_json)?.as_str())?.render(&config_data))
}
