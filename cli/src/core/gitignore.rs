use std::path::Path;

use anyhow::Result;

use super::rendered_template::RenderedTemplate;

pub(crate) fn generate_gitignore(path_dir: &String) -> Result<Option<RenderedTemplate>> {
    let path = Path::new(path_dir).join(".gitignore");

    if path.exists() {
        return Ok(None);
    }

    Ok(Some(RenderedTemplate {
        path,
        content: [
            "node_modules",
            ".idea",
            ".DS_Store",
            "",
            "dist",
            "lib",
            "",
            ".vscode",
            "",
            "*dist",
            "*lib",
        ]
        .join("\n"),
        context: None,
    }))
}
