use std::{fs::File, io::Write, path::Path};

use anyhow::{Context, Result};

use crate::constants::ERROR_FAILED_TO_CREATE_GITIGNORE;

pub(crate) fn setup_gitignore(path_dir: &String) -> Result<()> {
    let gitignore = [
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
    .join("\n");

    let path = Path::new(path_dir).join(".gitignore");
    if !path.exists() {
        let mut gitignore_file = File::create(path).context(ERROR_FAILED_TO_CREATE_GITIGNORE)?;
        gitignore_file
            .write_all(gitignore.as_bytes())
            .with_context(|| ERROR_FAILED_TO_CREATE_GITIGNORE)?;
    }

    Ok(())
}
