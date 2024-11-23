use clap::{Arg, ArgMatches, Command};

use super::forklaunch_command;

pub(crate) fn command() -> Command {
    forklaunch_command("library", "Initialize a new library")
        .alias("lib")
        .arg(
            Arg::new("name")
                .required(true)
                .help("The name of the application"),
        )
}

pub(crate) fn handler(matches: &ArgMatches) {
    println!("{:?}", matches);
}

use std::fs;
use std::io::Write;
use std::os::unix::fs::symlink;
use std::path::Path;

fn setup_basic_package() -> std::io::Result<()> {
    // Create symlinks
    symlink("../.prettierignore", ".prettierignore")?;
    symlink("../.prettierrc", ".prettierrc")?;
    symlink("../eslint.config.mjs", "eslint.config.mjs")?;

    // Link either vitest or jest config
    symlink("../vitest.config.ts", "vitest.config.ts")?;
    // symlink("../jest.config.ts", "jest.config.ts")?;

    // Create tsconfig.json
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

    // Create .gitignore
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

    // Create directories
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
