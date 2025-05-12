use std::path::Path;

use anyhow::Result;
use serde_json::{json, to_string_pretty};

use super::rendered_template::RenderedTemplate;

pub(crate) fn generate_tsconfig(path_dir: &Path) -> Result<Option<RenderedTemplate>> {
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
