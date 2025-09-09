use std::{
    fs::read_to_string,
    path::{Path, PathBuf},
};

use anyhow::Result;

use crate::core::{
    manifest::application::ApplicationManifestData, rendered_template::RenderedTemplate,
};

fn find_git_root(start_dir: &Path) -> Option<PathBuf> {
    let mut base_path = start_dir.canonicalize().ok()?;
    loop {
        let git_dir = base_path.join(".git");
        if git_dir.exists() {
            return Some(base_path.clone());
        }
        match base_path.parent() {
            Some(parent) => base_path = parent.to_path_buf(),
            None => break,
        }
    }
    None
}

pub(crate) fn create_or_merge_husky_pre_commit(
    path: &Path,
    manifest_data: &ApplicationManifestData,
) -> Result<RenderedTemplate> {
    let git_root = find_git_root(path).or(Some(path.to_path_buf())).unwrap();

    let husky_pre_commit_path = git_root.join(".husky").join("pre-commit");

    let content = if husky_pre_commit_path.exists() {
        read_to_string(&husky_pre_commit_path)?
    } else {
        format!(
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
        )
    };

    Ok(RenderedTemplate {
        path: husky_pre_commit_path,
        content,
        context: None,
    })
}
