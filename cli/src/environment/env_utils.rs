use anyhow::{Context, Result};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Represents an environment file with its variables
#[derive(Debug, Clone)]
pub struct EnvFile {
    #[allow(dead_code)]
    pub path: PathBuf,
    pub variables: HashMap<String, String>,
}

/// Load environment variables from a .env file
pub fn load_env_file(path: &Path) -> Result<HashMap<String, String>> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read env file: {}", path.display()))?;

    let mut variables = HashMap::new();

    for line in content.lines() {
        let line = line.trim();

        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Parse KEY=VALUE format
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().to_string();
            let value = value.trim().to_string();

            // Remove quotes if present
            let value = if (value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\''))
            {
                value[1..value.len() - 1].to_string()
            } else {
                value
            };

            variables.insert(key, value);
        }
    }

    Ok(variables)
}

/// Find all .env files in a project directory using regex pattern
pub fn find_env_files(project_path: &Path) -> Result<Vec<PathBuf>> {
    let mut env_files = Vec::new();

    if !project_path.exists() {
        return Ok(env_files);
    }

    // Regex pattern to match all .env files (.env, .env.local, .env.development, etc.)
    let env_regex = Regex::new(r"^\.env(\.[a-zA-Z0-9_-]+)*$")?;

    // Find all .env* files in the directory
    if let Ok(entries) = fs::read_dir(project_path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(file_name) = entry.file_name().to_str() {
                    if env_regex.is_match(file_name) && entry.path().is_file() {
                        env_files.push(entry.path());
                    }
                }
            }
        }
    }

    // Sort files for consistent ordering (.env.local typically takes precedence)
    env_files.sort_by(|a, b| {
        let a_name = a.file_name().unwrap().to_str().unwrap();
        let b_name = b.file_name().unwrap().to_str().unwrap();

        // Priority order: .env.local > .env.development > .env.production > .env.test > .env
        let get_priority = |name: &str| match name {
            ".env.local" => 0,
            ".env.development" => 1,
            ".env.production" => 2,
            ".env.test" => 3,
            ".env" => 4,
            _ => 5, // Other .env.* files
        };

        get_priority(a_name).cmp(&get_priority(b_name))
    });

    Ok(env_files)
}

/// Load all environment files for a project
pub fn load_project_env_files(project_path: &Path) -> Result<Vec<EnvFile>> {
    let env_file_paths = find_env_files(project_path)?;
    let mut env_files = Vec::new();

    for path in env_file_paths {
        let variables = load_env_file(&path)?;
        env_files.push(EnvFile { path, variables });
    }

    Ok(env_files)
}

/// Get all environment variables defined across all .env files in a project
#[allow(dead_code)]
pub fn get_all_env_vars_in_project(project_path: &Path) -> Result<HashSet<String>> {
    let env_files = load_project_env_files(project_path)?;
    let mut all_vars = HashSet::new();

    for env_file in env_files {
        for key in env_file.variables.keys() {
            all_vars.insert(key.clone());
        }
    }

    Ok(all_vars)
}

/// Check if an environment variable is defined in any of the project's .env files or cascading hierarchy
pub fn is_env_var_defined(project_path: &Path, var_name: &str) -> Result<bool> {
    // First check project-level .env files
    let env_files = load_project_env_files(project_path)?;
    for env_file in env_files {
        if env_file.variables.contains_key(var_name) {
            return Ok(true);
        }
    }

    // Then check cascading hierarchy (root .env.local files)
    if let Ok(workspace_root) = find_workspace_root(project_path) {
        let cascading_env_paths = get_cascading_env_paths(project_path, &workspace_root)?;

        for env_path in cascading_env_paths {
            if let Ok(variables) = load_env_file(&env_path) {
                if variables.contains_key(var_name) {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}

/// Find the most appropriate .env file to add a variable to
/// Priority: .env.local > .env > create .env.local
pub fn get_target_env_file(project_path: &Path) -> Result<PathBuf> {
    let env_local = project_path.join(".env.local");
    let env_default = project_path.join(".env");

    if env_local.exists() {
        Ok(env_local)
    } else if env_default.exists() {
        Ok(env_default)
    } else {
        // Create .env.local as the default
        Ok(env_local)
    }
}

/// Add environment variables to an .env file
pub fn add_env_vars_to_file(file_path: &Path, vars: &HashMap<String, String>) -> Result<()> {
    let mut content = String::new();

    // Read existing content if file exists
    if file_path.exists() {
        content = fs::read_to_string(file_path)
            .with_context(|| format!("Failed to read env file: {}", file_path.display()))?;

        // Ensure there's a newline at the end
        if !content.is_empty() && !content.ends_with('\n') {
            content.push('\n');
        }
    }

    // Load existing variables to avoid duplicates
    let existing_vars = load_env_file(file_path)?;

    // Add new variables
    for (key, value) in vars {
        if !existing_vars.contains_key(key) {
            content.push_str(&format!("{}={}\n", key, value));
        }
    }

    // Write back to file
    let mut file = fs::File::create(file_path)
        .with_context(|| format!("Failed to create env file: {}", file_path.display()))?;

    file.write_all(content.as_bytes())
        .with_context(|| format!("Failed to write to env file: {}", file_path.display()))?;

    Ok(())
}

/// Find the workspace root by looking for .forklaunch/manifest.toml
pub fn find_workspace_root(start_path: &Path) -> Result<PathBuf> {
    let mut current_path = start_path.canonicalize()?;

    loop {
        let manifest_path = current_path.join(".forklaunch").join("manifest.toml");
        if manifest_path.exists() {
            return Ok(current_path);
        }

        match current_path.parent() {
            Some(parent) => current_path = parent.to_path_buf(),
            None => {
                return Err(anyhow::anyhow!(
                    "Could not find workspace root (no .forklaunch/manifest.toml found)"
                ));
            }
        }
    }
}

/// Get the modules path from the manifest.toml file
pub fn get_modules_path(workspace_root: &Path) -> Result<PathBuf> {
    let manifest_path = workspace_root.join(".forklaunch").join("manifest.toml");

    if !manifest_path.exists() {
        return Err(anyhow::anyhow!(
            "Manifest file not found: {}",
            manifest_path.display()
        ));
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .with_context(|| format!("Failed to read manifest: {}", manifest_path.display()))?;

    // Parse TOML to get modules_path
    let manifest: toml::Value =
        toml::from_str(&manifest_content).with_context(|| "Failed to parse manifest.toml")?;

    let modules_path = manifest
        .get("modules_path")
        .and_then(|v| v.as_str())
        .unwrap_or(".");

    Ok(workspace_root.join(modules_path))
}

/// Get cascading environment file paths from project directory up to workspace root
/// This mimics the loadCascadingEnv behavior from the framework
/// Uses regex to find all .env* files (e.g., .env, .env.local, .env.development, etc.)
pub fn get_cascading_env_paths(project_path: &Path, workspace_root: &Path) -> Result<Vec<PathBuf>> {
    let mut env_paths = Vec::new();

    // Regex pattern to match all .env files (.env, .env.local, .env.development, etc.)
    let env_regex = Regex::new(r"^\.env(\.[a-zA-Z0-9_-]+)*$")?;

    // Collect all .env* files from project directory up to workspace root
    let mut current_path = project_path.canonicalize()?;
    let normalized_workspace_root = workspace_root.canonicalize()?;

    while current_path.starts_with(&normalized_workspace_root) {
        // Find all .env* files in current directory
        if let Ok(entries) = fs::read_dir(&current_path) {
            let mut current_dir_env_files = Vec::new();

            for entry in entries {
                if let Ok(entry) = entry {
                    if let Some(file_name) = entry.file_name().to_str() {
                        if env_regex.is_match(file_name) && entry.path().is_file() {
                            current_dir_env_files.push(entry.path());
                        }
                    }
                }
            }

            // Sort files for consistent ordering (.env.local typically takes precedence)
            current_dir_env_files.sort_by(|a, b| {
                let a_name = a.file_name().unwrap().to_str().unwrap();
                let b_name = b.file_name().unwrap().to_str().unwrap();

                // Priority order: .env.local > .env > .env.development > .env.production > .env.test
                let get_priority = |name: &str| match name {
                    ".env.local" => 0,
                    ".env" => 1,
                    ".env.development" => 2,
                    ".env.production" => 3,
                    ".env.test" => 4,
                    _ => 5, // Other .env.* files
                };

                get_priority(a_name).cmp(&get_priority(b_name))
            });

            env_paths.extend(current_dir_env_files);
        }

        if current_path == normalized_workspace_root {
            break;
        }

        match current_path.parent() {
            Some(parent) => current_path = parent.to_path_buf(),
            None => break,
        }
    }

    // Reverse to get root-to-project order (root variables loaded first, can be overridden by project)
    env_paths.reverse();

    Ok(env_paths)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_load_env_file() {
        let temp_dir = TempDir::new().unwrap();
        let env_path = temp_dir.path().join(".env");

        fs::write(
            &env_path,
            "KEY1=value1\nKEY2=\"value2\"\n# Comment\nKEY3=value3",
        )
        .unwrap();

        let vars = load_env_file(&env_path).unwrap();
        assert_eq!(vars.get("KEY1"), Some(&"value1".to_string()));
        assert_eq!(vars.get("KEY2"), Some(&"value2".to_string()));
        assert_eq!(vars.get("KEY3"), Some(&"value3".to_string()));
        assert_eq!(vars.len(), 3);
    }

    #[test]
    fn test_add_env_vars_to_file() {
        let temp_dir = TempDir::new().unwrap();
        let env_path = temp_dir.path().join(".env");

        let mut vars = HashMap::new();
        vars.insert("NEW_VAR".to_string(), "new_value".to_string());
        vars.insert("ANOTHER_VAR".to_string(), "another_value".to_string());

        add_env_vars_to_file(&env_path, &vars).unwrap();

        let loaded_vars = load_env_file(&env_path).unwrap();
        assert_eq!(loaded_vars.get("NEW_VAR"), Some(&"new_value".to_string()));
        assert_eq!(
            loaded_vars.get("ANOTHER_VAR"),
            Some(&"another_value".to_string())
        );
    }
}
