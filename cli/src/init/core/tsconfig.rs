use std::path::Path;

use anyhow::Result;

use super::rendered_template::RenderedTemplate;

pub(crate) fn generate_tsconfig(path_dir: &String) -> Result<Option<RenderedTemplate>> {
    let path = Path::new(path_dir).join("tsconfig.json");
    if path.exists() {
        return Ok(None);
    }

    Ok(Some(RenderedTemplate {
        path,
        content: serde_json::json!({
            "extends": "../tsconfig.base.json",
            "compilerOptions": {
                "outDir": "dist"
            },
            "exclude": [
                "node_modules",
                "dist"
            ]
        })
        .to_string(),
        context: None,
    }))
}
