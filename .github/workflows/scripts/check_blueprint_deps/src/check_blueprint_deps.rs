use serde_json::Value;
use std::collections::HashMap;
use std::fs::read_to_string;
use std::path::Path;

pub fn verify_package_versions(package_dirs: &[&str]) -> Result<(), String> {
    let mut inventory: HashMap<String, String> = HashMap::new();
    let mut last_comment = String::new();

    let contents =
        read_to_string("../../../../cli/src/init/core/package_json/package_json_constants.rs")
            .map_err(|e| e.to_string())?;

    for line in contents.lines() {
        if line.trim().starts_with("//") {
            last_comment = line.trim().to_string();
        } else if line.contains("_VERSION: &str =") {
            let version = line
                .split('=')
                .nth(1)
                .ok_or("Invalid version constant format")?
                .trim()
                .trim_matches(';')
                .trim_matches('"');

            if !last_comment.is_empty() {
                let packages = last_comment
                    .trim_start_matches("//")
                    .trim()
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                for package in packages {
                    inventory.insert(package, version.to_string());
                }
            }
        }

        if !line.trim().starts_with("//") {
            last_comment.clear();
        }
    }

    for dir in package_dirs {
        let path = Path::new(dir).join("package.json");
        let contents = read_to_string(&path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

        let pkg_json: Value = serde_json::from_str(&contents)
            .map_err(|e| format!("Invalid JSON in {}: {}", path.display(), e))?;

        for section in &["dependencies", "devDependencies", "peerDependencies"] {
            if let Some(deps) = pkg_json[section].as_object() {
                for (pkg, ver) in deps {
                    if let Some(expected) = inventory.get(pkg.as_str()) {
                        println!("Checking {} in {}", pkg, path.display());
                        let actual = ver.as_str().ok_or_else(|| {
                            format!("Invalid version for {} in {}", pkg, path.display())
                        })?;
                        if actual != expected && !actual.contains("workspace:") {
                            return Err(format!(
                                "Version mismatch for {} in {} {}: expected {}, got {}",
                                pkg,
                                path.display(),
                                section,
                                expected,
                                actual
                            ));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
