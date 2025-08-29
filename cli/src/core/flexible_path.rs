use std::{
    env::current_dir,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use clap::ArgMatches;
use rustyline::{Editor, history::DefaultHistory};
use termcolor::StandardStream;
use walkdir::WalkDir;

use crate::{
    constants::ERROR_FAILED_TO_GET_CWD,
    prompt::{ArrayCompleter, prompt_with_validation},
};

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum SearchDirection {
    Up,
    Down,
    Both,
}

#[derive(Debug, Clone)]
pub(crate) struct PathSearchConfig {
    pub max_depth: usize,
    pub direction: SearchDirection,
    pub manifest_name: String,
    pub manifest_dir: String,
}

impl Default for PathSearchConfig {
    fn default() -> Self {
        Self {
            max_depth: 4,
            direction: SearchDirection::Both,
            manifest_name: "manifest.toml".to_string(),
            manifest_dir: ".forklaunch".to_string(),
        }
    }
}

pub(crate) fn find_manifest_path(
    start_dir: &Path,
    config: &PathSearchConfig,
) -> Option<PathBuf> {
    match config.direction {
        SearchDirection::Up => search_upwards(start_dir, config),
        SearchDirection::Down => search_downwards(start_dir, config),
        SearchDirection::Both => {
            // Try upwards first, then downwards if not found
            search_upwards(start_dir, config)
                .or_else(|| search_downwards(start_dir, config))
        }
    }
}

fn search_upwards(start_dir: &Path, config: &PathSearchConfig) -> Option<PathBuf> {
    let mut current_path = Some(start_dir.to_path_buf());
    let mut depth = 0;
    
    while let Some(current) = current_path {
        if depth > config.max_depth {
            return None;
        }
        
        let candidate_path = current.join(&config.manifest_dir).join(&config.manifest_name);
        if candidate_path.exists() {
            return Some(candidate_path);
        }
        
        current_path = current.parent().map(|p| p.to_path_buf());
        depth += 1;
    }
    None
}

fn search_downwards(start_dir: &Path, config: &PathSearchConfig) -> Option<PathBuf> {
    for entry in WalkDir::new(start_dir)
        .max_depth(config.max_depth)
        .into_iter()
        .flatten()
    {
        let path = entry.path().join(&config.manifest_dir).join(&config.manifest_name);
        if path.exists() {
            return Some(path);
        }
    }
    None
}

pub(crate) fn prompt_flexible_path(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &ArgMatches,
    config: &PathSearchConfig,
) -> Result<String> {
    let current_path = current_dir().with_context(|| ERROR_FAILED_TO_GET_CWD)?;

    // Check if base_path argument is provided
    let maybe_defined_base_path = matches.get_one::<String>("base_path");
    let base_path = if let Some(base_path) = maybe_defined_base_path {
        base_path.to_string()
    } else {
        // Try to find a manifest automatically
        let maybe_manifest_path = find_manifest_path(&current_path, config);
        
        if let Some(manifest_path) = maybe_manifest_path {
            // Extract the directory containing the manifest
            manifest_path
                .parent()
                .and_then(|p| p.parent())
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| current_path.to_string_lossy().to_string())
        } else {
            // Prompt user for input
            prompt_with_validation(
                line_editor,
                stdout,
                "base_path",
                matches,
                "base path (optional, press enter for current directory)",
                None,
                |input: &str| {
                    if input.trim().is_empty() {
                        true // Empty input is always valid
                    } else {
                        let path = Path::new(input);
                        path.exists() && path.is_dir()
                    }
                },
                |_| "Path does not exist or is not a directory. Please try again.".to_string(),
            )?
        }
    };

    // Handle empty input by using current directory
    if base_path.trim().is_empty() {
        Ok(current_path.to_string_lossy().to_string())
    } else {
        // Canonicalize the provided path
        Ok(Path::new(&base_path)
            .canonicalize()
            .unwrap()
            .to_string_lossy()
            .to_string())
    }
}

// Helper function to create a config for specific use cases
pub(crate) fn create_generic_config() -> PathSearchConfig {
    PathSearchConfig {
        max_depth: 4,
        direction: SearchDirection::Both,
        manifest_name: "manifest.toml".to_string(),
        manifest_dir: ".forklaunch".to_string(),
    }
}

pub(crate) fn create_module_config() -> PathSearchConfig {
    PathSearchConfig {
        max_depth: 3,
        direction: SearchDirection::Up,
        manifest_name: "manifest.toml".to_string(),
        manifest_dir: ".forklaunch".to_string(),
    }
}

pub(crate) fn create_project_config() -> PathSearchConfig {
    PathSearchConfig {
        max_depth: 2,
        direction: SearchDirection::Down,
        manifest_name: "manifest.toml".to_string(),
        manifest_dir: ".forklaunch".to_string(),
    }
}
