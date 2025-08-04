use serde_json::Value;
use std::collections::HashMap;
use std::fs::read_to_string;
use std::path::{Path, PathBuf};

pub fn verify_package_versions(
    package_dirs: &[&str],
    implementation_refs: &Vec<PathBuf>,
) -> Result<(), String> {
    let mut inventory: HashMap<String, (String, u32)> = HashMap::new();
    let mut last_comment = String::new();
    let mut line_number = 0;

    let contents =
        read_to_string("../../../../cli/src/core/package_json/package_json_constants.rs")
            .map_err(|e| e.to_string())?;

    for line in contents.lines() {
        line_number += 1;
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
                    inventory.insert(package, (version.to_string(), line_number));
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
            inventory: &HashMap<String, (String, u32)>,
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
            if let Some((got, line_num)) = inventory.get(name) {
                println!("Checking {} in {}", name, path.display());
                let got_stripped = if let Some(first) = got.chars().next() {
                    if first == '~' || first == '^' {
                        &got[1..]
                    } else {
                        got.as_str()
                    }
                } else {
                    got.as_str()
                };
                if version != got_stripped {
                    return Err(format!(
                        r#"Version mismatch for {}: expected {}, got {} 
source: {}
destination: cli/src/core/package_json/package_json_constants.rs:{}"#,
                        name,
                        format!("{}{}", got.chars().next().unwrap(), version),
                        got,
                        path.display(),
                        line_num
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
                    if let Some((got, line_num)) = inventory.get(pkg.as_str()) {
                        println!("Checking {} in {}", pkg, path.display());
                        let expected = ver.as_str().ok_or_else(|| {
                            format!("Invalid version for {} in {}", pkg, path.display())
                        })?;
                        let mut expected_cmp = expected.to_string();
                        if pkg.starts_with("@forklaunch") && expected_cmp.starts_with('^') {
                            expected_cmp.replace_range(0..1, "~");
                        }
                        if &expected_cmp != got && !expected.contains("workspace:") {
                            return Err(format!(
                                r#"Version mismatch for {}: expected {}, got {} 
source: {} {}
defined in cli/src/core/package_json/package_json_constants.rs:{}"#,
                                pkg,
                                expected,
                                got,
                                path.display(),
                                section,
                                line_num
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
