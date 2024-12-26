use std::{
    fs::{read_to_string, write},
    path::Path,
};

use anyhow::{Context, Result};
use ramhorns::{Content, Template};
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string_pretty, to_value, Value};

use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON, ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
        ERROR_FAILED_TO_READ_PACKAGE_JSON, ERROR_FAILED_TO_WRITE_TO_PACKAGE_JSON,
    },
    init::service::ServiceConfigData,
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

pub(crate) fn update_application_package_json(
    config_data: &ServiceConfigData,
    base_path: &String,
) -> Result<()> {
    let mut full_package_json: Value = from_str(
        &read_to_string(Path::new(base_path).join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    let scripts = full_package_json["scripts"]
        .as_object_mut()
        .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    let database = config_data.database.to_string();

    let update_docker_cmd = |cmd: &str| {
        // Split into docker command and remaining commands
        let (docker_cmd, rest_cmd) = match cmd.split_once("&&") {
            Some((docker, rest)) => (docker.trim(), rest.trim()),
            None => (cmd.trim(), ""),
        };

        // Extract existing database services
        let mut services: Vec<&str> = docker_cmd
            .split("-d")
            .skip(1) // Skip the "docker compose up" part
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .collect();

        // Add new database service if not present
        if !services.contains(&database.as_str()) {
            services.push(&database);
            if config_data.is_mongo {
                services.push("mongo-init");
            }
        }

        // Build the new docker command
        let new_docker_cmd = format!(
            "docker compose up {}",
            services
                .iter()
                .map(|svc| format!("-d {}", svc))
                .collect::<Vec<_>>()
                .join(" ")
        );

        // Combine with rest of command if any
        if rest_cmd.is_empty() {
            new_docker_cmd
        } else {
            format!("{} && {}", new_docker_cmd, rest_cmd)
        }
    };

    if let Some(init_script) = scripts.get("migrate:init").and_then(Value::as_str) {
        scripts.insert(
            "migrate:init".to_string(),
            Value::String(update_docker_cmd(init_script)),
        );
    }

    if let Some(create_script) = scripts.get("migrate:create").and_then(Value::as_str) {
        scripts.insert(
            "migrate:create".to_string(),
            Value::String(update_docker_cmd(create_script)),
        );
    }

    if let Some(up_script) = scripts.get("migrate:up").and_then(Value::as_str) {
        scripts.insert(
            "migrate:up".to_string(),
            Value::String(update_docker_cmd(up_script)),
        );
    }

    if let Some(down_script) = scripts.get("migrate:down").and_then(Value::as_str) {
        scripts.insert(
            "migrate:down".to_string(),
            Value::String(update_docker_cmd(down_script)),
        );
    }

    full_package_json["scripts"] =
        to_value(scripts).with_context(|| ERROR_FAILED_TO_WRITE_TO_PACKAGE_JSON)?;

    write(
        Path::new(base_path).join("package.json"),
        serde_json::to_string_pretty(&full_package_json)?,
    )?;

    Ok(())
}
