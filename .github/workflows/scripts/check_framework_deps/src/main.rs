use std::fs;
use toml;

mod check_framework_deps;

fn main() {
    let topology = fs::read_to_string("../../../../framework/.forklaunch/manifest.toml")
        .expect("Failed to read manifest.toml");
    let projects: Vec<String> = toml::from_str::<toml::Value>(&topology)
        .expect("Failed to parse TOML")
        .get("project_peer_topology")
        .expect("Missing project_peer_topology section")
        .as_table()
        .unwrap()
        .get("forklaunch_framework")
        .expect("Missing forklaunch_framework section")
        .as_array()
        .expect("Expected forklaunch_framework to be an array")
        .iter()
        .map(|project| format!("../../../../framework/{}", project.as_str().unwrap()))
        .collect();
    let project_refs: Vec<&str> = projects.iter().map(|s| s.as_str()).collect();
    match check_framework_deps::verify_package_versions(&project_refs) {
        Ok(_) => println!("All package versions are correct"),
        Err(e) => println!("Error: {}", e),
    }
}
