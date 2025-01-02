use std::env::current_dir;

use anyhow::{Context, Result};
use clap::ArgMatches;
use rustyline::{history::DefaultHistory, Editor};
use termcolor::StandardStream;

use crate::{
    constants::ERROR_FAILED_TO_GET_CWD,
    prompt::{prompt_without_validation, ArrayCompleter},
};

pub(crate) fn prompt_base_path(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
) -> Result<String> {
    let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;
    let base_path = prompt_without_validation(
        line_editor,
        stdout,
        "base_path",
        matches,
        "Enter base path (optional, press enter for current directory): ",
    )?;
    if base_path.trim().is_empty() {
        Ok(current_path.to_str().unwrap().to_string())
    } else {
        Ok(base_path)
    }
}
