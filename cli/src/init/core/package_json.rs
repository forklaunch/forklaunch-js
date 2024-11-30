use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use ramhorns::{Content, Template};
use serde::{Deserialize, Serialize};

use super::config::Config;

#[derive(Debug, Serialize, Deserialize)]
struct PackageJson {
    #[serde(default)]
    workspaces: Option<Vec<String>>,
}

pub(crate) fn add_service_definition_to_package_json<T: Content + Config>(
    config_data: &T,
    base_path: &String,
) -> Result<String> {
    let mut package_json: PackageJson =
        serde_json::from_str(&read_to_string(Path::new(base_path).join("package.json"))?)?;

    if let Some(workspaces) = &mut package_json.workspaces {
        workspaces.push("{{service_name}}".to_string());
    }

    Ok(Template::new(serde_json::to_string(&package_json)?.as_str())?.render(&config_data))
}
