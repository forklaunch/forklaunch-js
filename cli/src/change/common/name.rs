use std::{fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use serde_json::Value;

use crate::{
    constants::ERROR_FAILED_TO_READ_PACKAGE_JSON,
    core::{
        manifest::{ManifestData, MutableManifestData},
        rendered_template::RenderedTemplate,
    },
};

pub(crate) fn change_name(
    base_path: &Path,
    name: &str,
    manifest_data: &mut MutableManifestData,
) -> Result<RenderedTemplate> {
    match manifest_data {
        MutableManifestData::Application(application_manifest_data) => {
            application_manifest_data.app_name = name.to_string();
        }
        MutableManifestData::Service(service_manifest_data) => {
            service_manifest_data.service_name = name.to_string();
        }
        MutableManifestData::Library(library_manifest_data) => {
            library_manifest_data.library_name = name.to_string();
        }
        MutableManifestData::Router(router_manifest_data) => {
            router_manifest_data.router_name = name.to_string();
        }
        MutableManifestData::Worker(worker_manifest_data) => {
            worker_manifest_data.worker_name = name.to_string();
        }
    }

    let package_json_path = base_path.join("package.json");

    let package_json_data =
        read_to_string(&package_json_path).with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;

    let mut package_json_data = serde_json::from_str::<Value>(&package_json_data)?;

    package_json_data["name"] = Value::String(name.to_string());

    let package_json_rendered_template = RenderedTemplate {
        path: package_json_path,
        content: serde_json::to_string_pretty(&package_json_data)?,
        context: None,
    };

    Ok(package_json_rendered_template)
}
