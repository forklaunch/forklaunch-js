use std::{path::Path, fs::read_to_string, io::Write};

use anyhow::{Context, Result};
use rustyline::{Editor, history::DefaultHistory};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    constants::{ERROR_FAILED_TO_READ_MANIFEST, ERROR_FAILED_TO_PARSE_MANIFEST},
    core::{manifest::{InitializableManifestConfig, InitializableManifestConfigMetadata, ManifestData, ProjectType, add_project_definition_to_manifest, library::LibraryManifestData}, name::validate_name},
    prompt::{ArrayCompleter, prompt_with_validation},
};

