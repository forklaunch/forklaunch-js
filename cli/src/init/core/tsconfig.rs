use std::{fs::File, io::Write, path::Path};

use anyhow::{Context, Result};

use crate::constants::error_failed_to_write_file;

pub(crate) fn setup_tsconfig(path_dir: &String) -> Result<()> {
    let tsconfig = serde_json::json!({
        "extends": "../tsconfig.base.json",
        "compilerOptions": {
            "outDir": "dist"
        },
        "exclude": [
            "node_modules",
            "dist"
        ]
    })
    .to_string();

    let path = Path::new(path_dir).join("tsconfig.json");
    if !path.exists() {
        let mut tsconfig_file =
            File::create(&path).with_context(|| error_failed_to_write_file(&path))?;
        tsconfig_file
            .write_all(tsconfig.as_bytes())
            .with_context(|| error_failed_to_write_file(&path))?;
    }
    Ok(())
}
