use std::{
    fs::read_to_string,
    path::{Path, PathBuf},
};

use anyhow::Result;

use super::flexible_path::{PathSearchConfig, SearchDirection, find_target_path};
use crate::core::{
    manifest::application::ApplicationManifestData, rendered_template::RenderedTemplate,
};

fn find_git_root(start_dir: &Path) -> Option<PathBuf> {
    let config = PathSearchConfig {
        max_depth: 4,
        direction: SearchDirection::Up,
        target_name: ".git".to_string(),
        target_dir: "".to_string(),
    };

    find_target_path(start_dir, &config)
        .and_then(|git_path| git_path.parent().map(|p| p.to_path_buf()))
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
