use std::{fs::read_to_string, path::Path};

use anyhow::{bail, Context, Result};
use ramhorns::{Content, Template};
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string_pretty, to_value, Value};

use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON,
        ERROR_FAILED_TO_GENERATE_PACKAGE_JSON, ERROR_FAILED_TO_PARSE_PACKAGE_JSON,
        ERROR_FAILED_TO_READ_PACKAGE_JSON, ERROR_FAILED_TO_UPDATE_APPLICATION_PACKAGE_JSON,
        ERROR_UNSUPPORTED_DATABASE,
    },
    core::manifest::{ManifestConfig, ProjectManifestConfig},
};

use super::{rendered_template::RenderedTemplate, template::TemplateManifestData};

pub(crate) mod application_package_json;
pub(crate) mod package_json_constants;
pub(crate) mod project_package_json;

#[derive(Debug, Serialize, Deserialize)]
struct PackageJson {
    #[serde(default)]
    workspaces: Option<Vec<String>>,
}

pub(crate) fn add_project_definition_to_package_json<
    T: Content + ManifestConfig + ProjectManifestConfig + Serialize,
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
    config_data: &TemplateManifestData,
    base_path: &String,
    existing_package_json: Option<String>,
) -> Result<Option<RenderedTemplate>> {
    let mut full_package_json: Value = from_str(
        &existing_package_json.unwrap_or(
            read_to_string(Path::new(base_path).join("package.json"))
                .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
        ),
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    let scripts = full_package_json["scripts"]
        .as_object_mut()
        .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    let database = match config_data {
        TemplateManifestData::Service(service_data) => service_data.database.to_string(),
        TemplateManifestData::Worker(worker_data) => worker_data.database.to_string(),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let is_mongo = match config_data {
        TemplateManifestData::Service(service_data) => service_data.is_mongo,
        TemplateManifestData::Worker(worker_data) => worker_data.is_mongo,
        _ => false,
    };

    let update_docker_cmd = |cmd: &str| {
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

        if !services.contains(&database.as_str()) {
            services.push(&database);
            if is_mongo {
                services.push("mongo-init");
            }
        }

        let new_docker_cmd = format!(
            "docker compose up {}",
            services
                .iter()
                .map(|svc| format!("-d {}", svc))
                .collect::<Vec<_>>()
                .join(" ")
        );

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
        to_value(scripts).with_context(|| ERROR_FAILED_TO_GENERATE_PACKAGE_JSON)?;

    Ok(Some(RenderedTemplate {
        path: Path::new(base_path).join("package.json"),
        content: to_string_pretty(&full_package_json)?,
        context: Some(ERROR_FAILED_TO_UPDATE_APPLICATION_PACKAGE_JSON.to_string()),
    }))
}
