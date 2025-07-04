use std::fs::{self, read_dir};
use std::path::PathBuf;
use toml;

mod check_blueprint_deps;

fn main() {
    let topology = fs::read_to_string("../../../../blueprint/.forklaunch/manifest.toml")
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
        .map(|project| format!("../../../../blueprint/{}", project.as_str().unwrap()))
        .collect();
    let mut implementation_refs = vec![];
    for folder in ["implementations", "interfaces"] {
        implementation_refs.push(
            read_dir(format!("../../../../blueprint/{}", folder))
                .unwrap()
                .map(|entry| entry.unwrap().path())
                .filter(|entry| entry.is_dir())
                .collect::<Vec<_>>(),
        );
    }
    implementation_refs.push(
        read_dir(format!("../../../../framework/infrastructure"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|entry| entry.is_dir())
            .collect::<Vec<_>>(),
    );
    implementation_refs.push(vec![PathBuf::from("../../../../framework/internal")]);
    let project_refs: Vec<&str> = projects.iter().map(|s| s.as_str()).collect();
    match check_blueprint_deps::verify_package_versions(
        &project_refs,
        &implementation_refs.concat(),
    ) {
        Ok(_) => println!("All package versions are correct"),
        Err(e) => println!("Error: {}", e),
    }
}
