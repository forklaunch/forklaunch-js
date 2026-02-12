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

    /// Normalize "@scope/name/subpath" to "@scope/name" for package.json lookup
    fn normalize_scoped_package(import_path: &str) -> String {
        if import_path.starts_with('@') {
            let parts: Vec<&str> = import_path.split('/').collect();
            if parts.len() >= 2 {
                return format!("{}/{}", parts[0], parts[1]);
            }
        }
        import_path.to_string()
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
                // NPM / Library import — normalize scoped subpaths and capture ALL non-relative imports
                let pkg_name = Self::normalize_scoped_package(&import);
                let version = self
                    .dependencies
                    .get(&pkg_name)
                    .or_else(|| self.dependencies.get(&import))
                    .cloned();
                children.push(CodeNode {
                    name: pkg_name,
                    node_type: "npm".to_string(),
                    version: version.or_else(|| Some("unknown".to_string())),
                    children: None,
                    path: None,
                });
            }
        }

        // Deduplicate npm children by name
        let mut seen = HashSet::new();
        let children: Vec<CodeNode> = children
            .into_iter()
            .filter(|c| {
                if c.node_type == "npm" {
                    seen.insert(c.name.clone())
                } else {
                    true
                }
            })
            .collect();

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_worker_controller_topology() {
        // Test with actual sample-worker controller
        let controller_path = Path::new("../blueprint/sample-worker/api/controllers/sampleWorker.controller.ts");
        let modules_root = Path::new("../blueprint/sample-worker");
        let package_json = Path::new("../blueprint/sample-worker/package.json");

        // Skip test if files don't exist (e.g., in CI without blueprint)
        if !controller_path.exists() {
            eprintln!("Skipping test - controller not found at: {:?}", controller_path);
            return;
        }

        let result = scan_route_topology(controller_path, modules_root, package_json);

        assert!(result.is_ok(), "Topology scan should succeed");

        let topology = result.unwrap();

        // Serialize to JSON first (to avoid ownership issues)
        let json = serde_json::to_string_pretty(&topology);
        assert!(json.is_ok(), "Should serialize to JSON");

        // Verify root node
        assert_eq!(topology.name, "sampleWorker.controller");
        assert_eq!(topology.node_type, "local");
        assert!(topology.path.is_some());

        // Verify it found dependencies
        assert!(topology.children.is_some(), "Should have dependencies");
        let children = topology.children.as_ref().unwrap();
        assert!(!children.is_empty(), "Should have at least one dependency");

        // Print topology for debugging
        println!("=== TOPOLOGY SCAN RESULTS ===");
        println!("Root: {} (type: {})", topology.name, topology.node_type);
        println!("Dependencies found: {}", children.len());

        for child in children {
            println!("  - {} (type: {}, version: {:?})",
                child.name,
                child.node_type,
                child.version
            );
        }

        // Verify we found both npm and local dependencies
        let has_npm = children.iter().any(|c| c.node_type == "npm");
        let has_local = children.iter().any(|c| c.node_type == "local");

        assert!(has_npm, "Should find npm dependencies");
        assert!(has_local, "Should find local dependencies");

        println!("\n=== JSON OUTPUT ===");
        println!("{}", json.unwrap());
    }

    #[test]
    fn test_scan_service_controller_topology() {
        // Test with actual billing-stripe service controller
        let controller_path = Path::new("../blueprint/billing-stripe/api/controllers/plan.controller.ts");
        let modules_root = Path::new("../blueprint/billing-stripe");
        let package_json = Path::new("../blueprint/billing-stripe/package.json");

        // Skip test if files don't exist
        if !controller_path.exists() {
            eprintln!("Skipping test - controller not found at: {:?}", controller_path);
            return;
        }

        let result = scan_route_topology(controller_path, modules_root, package_json);

        assert!(result.is_ok(), "Topology scan should succeed for service");

        let topology = result.unwrap();

        // Verify root node
        assert_eq!(topology.name, "plan.controller");
        assert_eq!(topology.node_type, "local");
        assert!(topology.path.is_some());

        // Verify it found dependencies
        assert!(topology.children.is_some(), "Service should have dependencies");
        let children = topology.children.as_ref().unwrap();
        assert!(!children.is_empty(), "Service should have at least one dependency");

        println!("=== SERVICE TOPOLOGY SCAN ===");
        println!("Root: {} (type: {})", topology.name, topology.node_type);
        println!("Dependencies found: {}", children.len());

        for child in children {
            println!("  - {} (type: {}, version: {:?})",
                child.name,
                child.node_type,
                child.version
            );
        }

        // Services should have npm dependencies like @forklaunch packages
        let has_forklaunch = children.iter().any(|c|
            c.name.starts_with("@forklaunch")
        );
        assert!(has_forklaunch, "Service should use @forklaunch packages");
    }

    #[test]
    fn test_extract_imports() {
        let scanner = ImportScanner::new(Path::new("."), Path::new("package.json"));

        let code = r#"
            import { handlers } from '@forklaunch/blueprint-core';
            import { ci, tokens } from '../../bootstrapper';
            import type { SomeType } from './types';
            import { something } from '@forklaunch-platform/iam/utils';
            import Stripe from 'stripe';
        "#;

        let imports = scanner.extract_imports(code);

        assert_eq!(imports.len(), 5);
        assert!(imports.contains(&"@forklaunch/blueprint-core".to_string()));
        assert!(imports.contains(&"../../bootstrapper".to_string()));
        assert!(imports.contains(&"./types".to_string()));
        assert!(imports.contains(&"@forklaunch-platform/iam/utils".to_string()));
        assert!(imports.contains(&"stripe".to_string()));
    }

    #[test]
    fn test_normalize_scoped_package() {
        // Scoped with subpath
        assert_eq!(
            ImportScanner::normalize_scoped_package("@forklaunch-platform/iam/utils"),
            "@forklaunch-platform/iam"
        );
        // Scoped without subpath
        assert_eq!(
            ImportScanner::normalize_scoped_package("@forklaunch/core"),
            "@forklaunch/core"
        );
        // Non-scoped package
        assert_eq!(
            ImportScanner::normalize_scoped_package("stripe"),
            "stripe"
        );
        // Non-scoped with subpath (shouldn't happen in practice but handled)
        assert_eq!(
            ImportScanner::normalize_scoped_package("express"),
            "express"
        );
    }
}
