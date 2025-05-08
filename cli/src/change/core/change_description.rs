use anyhow::Result;

use crate::core::{
    manifest::MutableManifestData, package_json::project_package_json::ProjectPackageJson,
};

pub(crate) fn change_description(
    description: &str,
    manifest_data: MutableManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    match manifest_data {
        MutableManifestData::Library(manifest_data) => {
            manifest_data.description = description.to_string();
        }
        MutableManifestData::Service(manifest_data) => {
            manifest_data.description = description.to_string();
        }
        MutableManifestData::Worker(manifest_data) => {
            manifest_data.description = description.to_string();
        }
        MutableManifestData::Application(manifest_data) => {
            manifest_data.description = description.to_string();
        }
        _ => {}
    }

    project_package_json.description = Some(description.to_string());
    Ok(())
}
