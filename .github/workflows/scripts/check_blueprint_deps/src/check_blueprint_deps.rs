use serde_json::Value;
use std::collections::HashMap;
use std::fs::read_to_string;
use std::path::{Path, PathBuf};

pub fn verify_package_versions(
    package_dirs: &[&str],
    implementation_refs: &Vec<PathBuf>,
) -> Result<(), String> {
    let mut inventory: HashMap<String, String> = HashMap::new();
    let mut last_comment = String::new();

    let contents =
        read_to_string("../../../../cli/src/core/package_json/package_json_constants.rs")
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

    for implementation in implementation_refs {
        fn check_package_json(
            path: &Path,
            inventory: &HashMap<String, String>,
        ) -> Result<(), String> {
            let package_json_string = read_to_string(path)
                .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
            let package_json: Value = serde_json::from_str(&package_json_string).map_err(|e| {
                format!(
                    "Failed to parse package.json for {}: {}",
                    package_json_string, e
                )
            })?;
            let name: &str = package_json["name"].as_str().ok_or_else(|| {
                format!(
                    "Package.json for {} does not contain a name",
                    package_json_string
                )
            })?;
            let version: &str = package_json["version"].as_str().ok_or_else(|| {
                format!(
                    "Package.json for {} does not contain a version",
                    package_json_string
                )
            })?;
            if let Some(expected) = inventory.get(name) {
                println!("Checking {} in {}", name, path.display());
                if format!("^{}", version) != expected.clone() {
                    return Err(format!(
                        "Version mismatch for {} in {}: expected {}, got {}",
                        name,
                        path.display(),
                        expected,
                        format!("^{}", version)
                    ));
                }
            } else {
                println!(
                    "Warning: Package not found in package_json_consts: {}",
                    name
                );
            }
            Ok(())
        }

        // Walk through subdirectories looking for package.json files
        for entry in walkdir::WalkDir::new(implementation)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name() == "package.json")
        {
            check_package_json(entry.path(), &inventory)?;
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
                    } else {
                        println!("Warning: Package not found in package_json_consts: {}", pkg);
                    }
                }
            }
        }
    }

    Ok(())
}
