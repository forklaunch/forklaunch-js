use clap::{Arg, ArgMatches, Command};
use std::fs;
use std::io::Write;
use std::os::unix::fs::symlink;
use std::path::Path;

use super::application::ConfigData;
use super::forklaunch_command;

pub(super) fn command() -> Command {
    forklaunch_command("library", "Initialize a new library")
        .alias("lib")
        .arg(
            Arg::new("name")
                .required(true)
                .help("The name of the application"),
        )
}

pub(super) fn handler(matches: &ArgMatches) {
    println!("{:?}", matches);
}

pub(super) fn setup_symlinks(
    base_path: Option<&str>,
    current_path: Option<&str>,
    config_data: &ConfigData,
) -> std::io::Result<()> {
    // Create symlinks
    let source_path_prefix = match base_path {
        Some(base_path) => Path::new(base_path),
        None => Path::new(".."),
    };

    let current_path_prefix = match current_path {
        Some(current_path) => Path::new(current_path),
        None => Path::new("."),
    };

    symlink(
        source_path_prefix.join(".prettierignore"),
        current_path_prefix.join(".prettierignore"),
    )?;
    symlink(
        source_path_prefix.join(".prettierrc"),
        current_path_prefix.join(".prettierrc"),
    )?;
    symlink(
        source_path_prefix.join("eslint.config.mjs"),
        current_path_prefix.join("eslint.config.mjs"),
    )?;

    match config_data.test_framework.as_str() {
        "vitest" => symlink(
            source_path_prefix.join("vitest.config.ts"),
            current_path_prefix.join("vitest.config.ts"),
        ),
        "jest" => symlink(
            source_path_prefix.join("jest.config.ts"),
            current_path_prefix.join("jest.config.ts"),
        ),
        _ => Ok(()),
    }
}

pub(super) fn setup_tsconfig() -> std::io::Result<()> {
    let tsconfig = r#"{
	"extends": "../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist"
    },
    "exclude": [
        "node_modules",
        "dist"
    ]
}"#;

    let mut tsconfig_file = fs::File::create("tsconfig.json")?;
    tsconfig_file.write_all(tsconfig.as_bytes())?;
    Ok(())
}

pub(super) fn setup_gitignore() -> std::io::Result<()> {
    let gitignore = r#"node_modules
.idea
.DS_Store

dist
lib

.vscode

*dist
*lib"#;
    let mut gitignore_file = fs::File::create(".gitignore")?;
    gitignore_file.write_all(gitignore.as_bytes())?;

    Ok(())
}

pub(super) fn setup_basic_package(
    base_path: Option<&str>,
    current_path: Option<&str>,
    config_data: &ConfigData,
) -> std::io::Result<()> {
    self::setup_symlinks(base_path, current_path, config_data)?;
    self::setup_tsconfig()?;
    self::setup_gitignore()?;

    let dirs = [
        "controllers",
        "interfaces",
        "middleware",
        "models",
        "routes",
        "services",
        "utils",
    ];
    for dir in dirs {
        fs::create_dir(dir)?;
    }

    Ok(())
}
