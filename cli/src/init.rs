use std::{
    env::{current_dir, current_exe},
    fs::{create_dir_all, read_dir, File},
    io::Write,
    os::unix::fs::symlink,
    path::Path,
};

use anyhow::Result;
use application::ApplicationCommand;
use clap::{ArgMatches, Command};
use library::LibraryCommand;
use pathdiff::diff_paths;
use ramhorns::{Content, Ramhorns};
use serde::Serialize;
use service::ServiceCommand;
use std::fs::write;
use toml::to_string_pretty;

use crate::{utils::forklaunch_command, CliCommand};

mod application;
mod library;
mod service;

#[macro_use]
mod config_macro;

// TODO: add injected token into struct
#[derive(Debug)]
pub(crate) struct InitCommand {
    application: ApplicationCommand,
    library: LibraryCommand,
    service: ServiceCommand,
}

impl InitCommand {
    pub(crate) fn new() -> Self {
        Self {
            application: ApplicationCommand::new(),
            library: LibraryCommand::new(),
            service: ServiceCommand::new(),
        }
    }
}

#[derive(Debug)]
struct PathIO {
    input_path: String,
    output_path: String,
}

trait Config {
    fn test_framework(&self) -> &String;
}

impl CliCommand for InitCommand {
    fn command(&self) -> Command {
        forklaunch_command("init", "Initialize a new forklaunch project")
            .subcommand_required(true)
            .subcommand(self.application.command())
            .subcommand(self.library.command())
            .subcommand(self.service.command())
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("application", sub_matches)) => self.application.handler(sub_matches),
            Some(("library", sub_matches)) => self.library.handler(sub_matches),
            Some(("service", sub_matches)) => self.service.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}

fn setup_forklaunch_config<T: Content + Config + Serialize>(
    path_dir: &String,
    data: &T,
) -> Result<()> {
    let config_str = to_string_pretty(&data)?;
    let forklaunch_path = Path::new(path_dir).join(".forklaunch");

    if !forklaunch_path.exists() {
        create_dir_all(&forklaunch_path)?;
    }

    let config_path = forklaunch_path.join("config.toml");
    if !config_path.exists() {
        write(config_path, config_str)?;
    }
    Ok(())
}

fn get_template_path(path: &PathIO) -> Result<String> {
    Ok(current_exe()?
        .parent()
        .unwrap()
        .join(&path.input_path)
        .to_string_lossy()
        .to_string())
}

fn setup_with_template<T: Content + Config>(
    name: Option<&String>,
    template_dir: &PathIO,
    template: &mut Ramhorns,
    data: &T,
    ignore_files: &Vec<String>,
) -> Result<()> {
    let output_dir = match name {
        Some(name) => Path::new(name).join(&template_dir.output_path),
        None => Path::new(&template_dir.output_path).to_path_buf(),
    };

    for entry in read_dir(get_template_path(&template_dir)?)? {
        let entry = entry?;
        let path = entry.path();

        let output_path = output_dir.join(path.file_name().unwrap());
        if !output_path.exists() {
            create_dir_all(output_path.parent().unwrap())?;
        }

        if path.is_file() {
            let tpl = template.from_file(&path.to_str().unwrap())?;
            let rendered = tpl.render(&data);
            if !output_path.exists()
                && !ignore_files
                    .iter()
                    .any(|ignore_file| output_path.to_str().unwrap().contains(ignore_file))
            {
                write(output_path, rendered)?;
            }
        } else if path.is_dir() {
            setup_with_template(
                name,
                &PathIO {
                    input_path: Path::new(&template_dir.input_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                    output_path: Path::new(&template_dir.output_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                },
                template,
                data,
                ignore_files,
            )?;
        }
    }

    Ok(())
}

fn setup_symlinks<T: Content + Config>(
    base_path_dir: Option<&String>,
    path_dir: &String,
    config_data: &T,
) -> Result<()> {
    let current_path_dir = current_dir()?;
    let source_path = match base_path_dir {
        Some(base_path) => Path::new(base_path),
        None => current_path_dir.as_path(),
    };

    let current_path = Path::new(path_dir);

    let relative_path =
        diff_paths(source_path, current_path).expect("Failed to compute relative path");

    if !current_path.join(".prettierignore").exists() {
        symlink(
            relative_path.join(".prettierignore"),
            current_path.join(".prettierignore"),
        )?;
    }

    if !current_path.join(".prettierrc").exists() {
        symlink(
            relative_path.join(".prettierrc"),
            current_path.join(".prettierrc"),
        )?;
    }

    if !current_path.join("eslint.config.mjs").exists() {
        symlink(
            relative_path.join("eslint.config.mjs"),
            current_path.join("eslint.config.mjs"),
        )?;
    }

    match config_data.test_framework().as_str() {
        "vitest" => {
            if !current_path.join("vitest.config.ts").exists() {
                symlink(
                    relative_path.join("vitest.config.ts"),
                    current_path.join("vitest.config.ts"),
                )?
            }
        }
        "jest" => {
            if !current_path.join("jest.config.ts").exists() {
                symlink(
                    relative_path.join("jest.config.ts"),
                    current_path.join("jest.config.ts"),
                )?
            }
        }
        _ => (),
    }

    Ok(())
}

fn setup_tsconfig(path_dir: &String) -> Result<()> {
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

    let path = Path::new(path_dir).join("tsconfig.json");
    if !path.exists() {
        let mut tsconfig_file = File::create(path)?;
        tsconfig_file.write_all(tsconfig.as_bytes())?;
    }
    Ok(())
}

fn setup_gitignore(path_dir: &String) -> Result<()> {
    let gitignore = r#"node_modules
.idea
.DS_Store

dist
lib

.vscode

*dist
*lib"#;

    let path = Path::new(path_dir).join(".gitignore");
    if !path.exists() {
        let mut gitignore_file = File::create(path)?;
        gitignore_file.write_all(gitignore.as_bytes())?;
    }

    Ok(())
}
