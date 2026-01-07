use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LibraryDefinition {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodeNode {
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: String, // "local" | "npm"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>, // for npm
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<CodeNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>, // absolute or relative path for local files
}

pub fn scan_project_libraries(package_json_path: &Path) -> Result<Vec<LibraryDefinition>> {
    let content = fs::read_to_string(package_json_path).context(format!(
        "Failed to read package.json at {:?}",
        package_json_path
    ))?;

    let json: serde_json::Value = serde_json::from_str(&content)?;

    let mut libraries = Vec::new();

    if let Some(dependencies) = json.get("dependencies").and_then(|d| d.as_object()) {
        for (name, version) in dependencies {
            // Check for @forklaunch or other "top level" libraries
            // The user said "stored in the manifest locally", implying workspace libs?
            // For now, let's include everything starting with @forklaunch
            if name.starts_with("@forklaunch") {
                libraries.push(LibraryDefinition {
                    name: name.clone(),
                    version: version.as_str().unwrap_or("unknown").to_string(),
                });
            }
        }
    }

    Ok(libraries)
}

pub fn scan_route_topology(
    file_path: &Path,
    modules_root: &Path,
    package_json_path: &Path,
) -> Result<CodeNode> {
    let mut scanner = ImportScanner::new(modules_root, package_json_path);
    scanner.scan(file_path)
}

struct ImportScanner {
    modules_root: PathBuf,
    dependencies: HashMap<String, String>,
    visited: HashSet<PathBuf>,
}

impl ImportScanner {
    fn new(modules_root: &Path, package_json_path: &Path) -> Self {
        let dependencies = Self::load_dependencies(package_json_path).unwrap_or_default();
        Self {
            modules_root: modules_root.to_path_buf(),
            dependencies,
            visited: HashSet::new(),
        }
    }

    fn load_dependencies(package_json_path: &Path) -> Result<HashMap<String, String>> {
        let content = fs::read_to_string(package_json_path)?;
        let json: serde_json::Value = serde_json::from_str(&content)?;
        let mut deps = HashMap::new();
        if let Some(d) = json.get("dependencies").and_then(|v| v.as_object()) {
            for (k, v) in d {
                deps.insert(k.clone(), v.as_str().unwrap_or("").to_string());
            }
        }
        // Also check devDependencies just in case
        if let Some(d) = json.get("devDependencies").and_then(|v| v.as_object()) {
            for (k, v) in d {
                deps.insert(k.clone(), v.as_str().unwrap_or("").to_string());
            }
        }
        Ok(deps)
    }

    fn scan(&mut self, file_path: &Path) -> Result<CodeNode> {
        let file_name = file_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Circular dependency check
        if self.visited.contains(file_path) {
            return Ok(CodeNode {
                name: format!("{} (Cycle)", file_name),
                node_type: "local".to_string(),
                version: None,
                children: None,
                path: Some(file_path.to_string_lossy().to_string()),
            });
        }
        self.visited.insert(file_path.to_path_buf());

        let content = fs::read_to_string(file_path).unwrap_or_default();
        let imports = self.extract_imports(&content);

        let mut children = Vec::new();

        for import in imports {
            if import.starts_with(".") {
                // Local import
                let parent_dir = file_path.parent().unwrap();
                let resolved = self.resolve_local_import(parent_dir, &import);
                if let Some(resolved_path) = resolved {
                    // Only scan if it's inside the modules root to avoid escaping
                    if resolved_path.starts_with(&self.modules_root) {
                        if let Ok(child_node) = self.scan(&resolved_path) {
                            children.push(child_node);
                        }
                    }
                }
            } else {
                // NPM / Library import
                // Filter out standard node modules (fs, path, etc)?
                // For now, check if it's in package.json
                if let Some(version) = self.dependencies.get(&import) {
                    children.push(CodeNode {
                        name: import.clone(),
                        node_type: "npm".to_string(),
                        version: Some(version.clone()),
                        children: None,
                        path: None,
                    });
                } else if import.starts_with("@") {
                    // Scoped package not in direct deps (transitive?), still show
                    children.push(CodeNode {
                        name: import.clone(),
                        node_type: "npm".to_string(),
                        version: Some("unknown".to_string()),
                        children: None,
                        path: None,
                    });
                }
            }
        }

        self.visited.remove(file_path); // Allow visiting again in other branches? Actually DAG is better.
        // If we want a Tree, we duplicate nodes. If we want a Graph, we reference ID.
        // User asked for "full code trees", implying recursive structure.

        Ok(CodeNode {
            name: file_name,
            node_type: "local".to_string(),
            version: None,
            children: if children.is_empty() {
                None
            } else {
                Some(children)
            },
            path: Some(
                file_path
                    .strip_prefix(&self.modules_root)
                    .unwrap_or(file_path)
                    .to_string_lossy()
                    .to_string(),
            ),
        })
    }

    fn extract_imports(&self, content: &str) -> Vec<String> {
        let re = Regex::new(r#"import\s+(?:[\w\s{},*]+from\s+)?['"]([^'"]+)['"]"#).unwrap();
        re.captures_iter(content)
            .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
            .collect()
    }

    fn resolve_local_import(&self, param_dir: &Path, import_path: &str) -> Option<PathBuf> {
        let base = param_dir.join(import_path);

        // Try exact match
        if base.exists() && base.is_file() {
            return Some(base);
        }

        // Try .ts
        let ts = base.with_extension("ts");
        if ts.exists() {
            return Some(ts);
        }

        // Try .tsx
        let tsx = base.with_extension("tsx");
        if tsx.exists() {
            return Some(tsx);
        }

        // Try /index.ts
        let index = base.join("index.ts");
        if index.exists() {
            return Some(index);
        }

        None
    }
}
