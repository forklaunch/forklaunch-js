// Note: This file should be moved to cli/build.rs, not cli/src/build.rs
// Build scripts should be at the crate root level, not in src/
use std::fs;
use std::path::{Path, PathBuf};

fn copy_templates(src: &Path, dest: &Path) -> std::io::Result<()> {
    if !dest.exists() {
        fs::create_dir_all(dest)?;
    }

    for entry in fs::read_dir(src)? {
        println!("{:?}", entry);
        let entry = entry?;
        let path = entry.path();
        let dest_path = dest.join(path.file_name().unwrap());

        if path.is_file() {
            if path.is_symlink() {
                let real_path = fs::read_link(&path)?;
                fs::copy(src.join(real_path), &dest_path)?;
            } else {
                fs::copy(&path, &dest_path)?;
            }
        } else if path.is_dir() {
            copy_templates(&path, &dest_path)?;
        }
    }

    Ok(())
}

fn main() -> std::io::Result<()> {
    let out_dir = PathBuf::from(std::env::var("CARGO_TARGET_DIR").unwrap_or("target".to_string()))
        .join(std::env::var("PROFILE").unwrap_or("debug".to_string()));
    let templates_dir = PathBuf::from("src/templates");

    copy_templates(&templates_dir, &out_dir.join("templates"))?;

    println!("cargo:rerun-if-changed=src/templates");
    Ok(())
}
