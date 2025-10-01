use std::{fs::read_to_string, path::Path};

use anyhow::Result;

use crate::core::{
    manifest::application::ApplicationManifestData,
    rendered_template::{RenderedTemplate, TEMPLATES_DIR},
};

pub(crate) fn create_or_merge_husky_pre_commit(
    path: &Path,
    manifest_data: &ApplicationManifestData,
) -> Result<Vec<RenderedTemplate>> {
    let mut rendered_templates = Vec::new();

    let husky_pre_commit_path = path.join(".husky").join("pre-commit");

    let content_to_append = format!(
        "cd {}\n{} sort-package-json */package.json\n{} lint-staged --relative\n",
        manifest_data.modules_path,
        if manifest_data.runtime == "bun" {
            "bun"
        } else {
            "pnpm"
        },
        if manifest_data.runtime == "bun" {
            "bun"
        } else {
            "pnpm"
        }
    );

    let content = format!(
        "{}",
        if husky_pre_commit_path.exists() {
            let existing_content = read_to_string(&husky_pre_commit_path)?;
            if !existing_content.contains(content_to_append.as_str()) {
                if existing_content.ends_with("\n") {
                    existing_content + content_to_append.as_str()
                } else {
                    existing_content + "\n" + content_to_append.as_str()
                }
            } else {
                existing_content
            }
        } else {
            content_to_append
        }
    );

    let husky_dir = TEMPLATES_DIR.get_dir("husky/_").unwrap();

    for file in husky_dir.files() {
        rendered_templates.push(RenderedTemplate {
            path: path.join(".husky").join("_").join(
                file.path()
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_string(),
            ),
            content: file.contents_utf8().unwrap().to_string(),
            context: None,
        });
    }

    rendered_templates.push(RenderedTemplate {
        path: path.join(".husky").join("_").join(".gitignore"),
        content: "*".to_string(),
        context: None,
    });

    rendered_templates.push(RenderedTemplate {
        path: husky_pre_commit_path,
        content,
        context: None,
    });

    Ok(rendered_templates)
}
