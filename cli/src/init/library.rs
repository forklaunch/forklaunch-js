use anyhow::Result;
use clap::{Arg, ArgMatches, Command};
use ramhorns::{Content, Ramhorns};
use serde::{Deserialize, Serialize};
use std::env::{current_dir, current_exe};
use std::fs::read_to_string;
use std::path::Path;
use toml::from_str;

use crate::config_struct;

use super::core::gitignore::setup_gitignore;
use super::core::symlinks::setup_symlinks;
use super::core::template::{setup_with_template, PathIO};
use super::core::tsconfig::setup_tsconfig;
use super::{forklaunch_command, CliCommand};

config_struct!(
    #[derive(Debug, Content, Serialize)]
    struct LibraryConfigData {
        library_name: String,
    }
);

#[derive(Debug)]
pub(super) struct LibraryCommand;

impl LibraryCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for LibraryCommand {
    fn command(&self) -> Command {
        forklaunch_command("library", "Initialize a new library")
            .alias("lib")
            .arg(
                Arg::new("name")
                    .required(true)
                    .help("The name of the library"),
            )
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .required(false)
                    .help("The application path to initialize the library in."),
            )
    }

    // pass token in from parent and perform get token above?
    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let library_name = matches.get_one::<String>("name").unwrap();
        let current_path = current_dir()?;
        let base_path = match matches.get_one::<String>("base_path") {
            Some(path) => path,
            None => current_path.to_str().unwrap(),
        };

        let config_path = Path::new(&base_path)
            .join(".forklaunch")
            .join("config.toml");

        let mut config_data: LibraryConfigData = from_str(&read_to_string(config_path)?)?;
        config_data.library_name = library_name.clone();

        setup_basic_library(&library_name, &base_path.to_string(), &config_data)?;
        Ok(())
    }
}

fn setup_basic_library(
    library_name: &String,
    base_path: &String,
    config_data: &LibraryConfigData,
) -> Result<()> {
    let output_path = Path::new(base_path)
        .join(library_name)
        .to_string_lossy()
        .to_string();

    let template_dir = PathIO {
        input_path: Path::new("templates")
            .join("project")
            .join("library")
            .to_string_lossy()
            .to_string(),
        output_path: output_path.clone(),
    };
    let mut template = Ramhorns::lazy(current_exe()?.parent().unwrap())?;

    let ignore_files = vec![];

    setup_with_template(
        None,
        &template_dir,
        &mut template,
        config_data,
        &ignore_files,
    )?;
    setup_symlinks(Some(base_path), &template_dir.output_path, config_data)?;
    setup_tsconfig(&output_path)?;
    setup_gitignore(&output_path)?;

    Ok(())
}
