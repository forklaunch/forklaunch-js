use std::path::Path;

use anyhow::Result;
use serde_json::{Value, json, to_string_pretty};

use super::rendered_template::RenderedTemplate;
use crate::core::manifest::application::ApplicationManifestData;

pub(crate) fn generate_project_tsconfig(path_dir: &Path) -> Result<Option<RenderedTemplate>> {
    let path = path_dir.join("tsconfig.json");
    if path.exists() {
        return Ok(None);
    }

    Ok(Some(RenderedTemplate {
        path,
        content: to_string_pretty(&json!({
            "extends": "../tsconfig.base.json",
            "compilerOptions": {
                "outDir": "dist"
            },
            "exclude": [
                "node_modules",
                "dist",
                "eslint.config.mjs"
            ]
        }))?,
        context: None,
    }))
}

pub(crate) fn generate_root_tsconfig(
    path_dir: &Path,
    manifest_data: &ApplicationManifestData,
) -> Result<Option<RenderedTemplate>> {
    let path = path_dir.join("tsconfig.json");
    if path.exists() {
        return Ok(None);
    }

    let references = manifest_data
        .projects
        .iter()
        .map(|project| json!({ "path": project.name }))
        .collect::<Vec<Value>>();

    Ok(Some(RenderedTemplate {
        path,
        content: to_string_pretty(&json!({
          "files": [],
          "references": references,
          "compilerOptions": {
            "declaration": true,
            "declarationMap": true
          }
        }))?,
        context: None,
    }))
}
