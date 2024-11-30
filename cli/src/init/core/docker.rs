use std::{collections::HashMap, fs::read_to_string, path::Path};

use anyhow::Result;
use ramhorns::{Content, Template};
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string};

use super::config::Config;

#[derive(Debug, Serialize, Deserialize)]
struct DockerCompose {
    services: HashMap<String, DockerService>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DockerService {
    hostname: String,
    container_name: String,
    restart: String,
    build: DockerBuild,
    image: String,
    environment: HashMap<String, String>,
    depends_on: Vec<String>,
    ports: Vec<String>,
    networks: Vec<String>,
    volumes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DockerBuild {
    context: String,
    dockerfile: String,
}

pub(crate) fn add_service_definition_to_docker_compose<T: Content + Config>(
    config_data: &T,
    base_path: &String,
) -> Result<(String, i32)> {
    let mut docker_compose: DockerCompose = from_str(&read_to_string(
        Path::new(base_path).join("docker-compose.yml"),
    )?)?;

    let mut port_number = 8000;
    for (_, value) in docker_compose.services.iter() {
        for port in value.ports.iter() {
            if let Some(port_num) = port.split(':').nth(1) {
                if let Ok(num) = port_num.parse::<i32>() {
                    if num >= 8000 && num <= 9000 && num > port_number {
                        port_number = num;
                    }
                }
            }
        }
        if value.container_name == "{{app_name}}-{{service_name}}" {
            return Ok((to_string(&docker_compose)?, port_number));
        }
    }

    port_number += 1;

    docker_compose.services.insert(
        "{{service_name}}".to_string(),
        DockerService {
            hostname: "{{service_name}}".to_string(),
            container_name: "{{app_name}}-{{service_name}}".to_string(),
            restart: "always".to_string(),
            build: DockerBuild {
                context: "./{{service_name}}".to_string(),
                dockerfile: "./Dockerfile.dev".to_string(),
            },
            image: "{{app_name}}_{{service_name}}:latest".to_string(),
            environment: HashMap::new(),
            depends_on: vec!["postgres".to_string(), "redis".to_string()],
            ports: vec![format!("8000:{}", port_number)],
            networks: vec!["{{app_name}}-network".to_string()],
            volumes: vec!["{{service_name}}:{{service_name}}".to_string()],
        },
    );

    Ok((
        Template::new(to_string(&docker_compose)?.as_str())?.render(&config_data),
        port_number,
    ))
}
