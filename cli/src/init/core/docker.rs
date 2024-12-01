use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string, to_value, Value};

use crate::init::service::ServiceConfigData;

#[derive(Debug, Serialize, Deserialize)]
struct DockerCompose {
    services: IndexMap<String, DockerService>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DockerService {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hostname: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    container_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    restart: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    build: Option<DockerBuild>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    environment: Option<IndexMap<String, String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    depends_on: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    ports: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    networks: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    volumes: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DockerBuild {
    context: String,
    dockerfile: String,
}

pub(crate) fn add_service_definition_to_docker_compose(
    config_data: &ServiceConfigData,
    base_path: &String,
) -> Result<(String, i32)> {
    let mut full_docker_compose: Value = from_str(&read_to_string(
        Path::new(base_path).join("docker-compose.yml"),
    )?)?;
    let mut docker_compose: DockerCompose = Deserialize::deserialize(&full_docker_compose)?;

    let mut port_number = 8000;
    for (_, value) in docker_compose.services.iter() {
        if let Some(ports) = &value.ports {
            for port in ports {
                if let Some(port_num) = port.split(':').nth(1) {
                    if let Ok(num) = port_num.parse::<i32>() {
                        if num >= 8000 && num <= 9000 && num > port_number {
                            port_number = num;
                        }
                    }
                }
            }
        }

        if let Some(container_name) = &value.container_name {
            if container_name == &format!("{}-{}", config_data.app_name, config_data.service_name) {
                return Ok((to_string(&full_docker_compose)?, port_number));
            }
        }
    }

    port_number += 1;

    let mut environment = IndexMap::new();
    environment.insert(
        "POSTGRES_URL".to_string(),
        "postgres://postgres:postgres@postgres:5432/postgres".to_string(),
    );
    environment.insert("REDIS_URL".to_string(), "redis://redis:6379".to_string());
    environment.insert("HOST".to_string(), "0.0.0.0".to_string());
    environment.insert("PORT".to_string(), port_number.to_string());
    environment.insert("ENVIRONMENT".to_string(), "development".to_string());

    docker_compose.services.insert(
        config_data.service_name.clone(),
        DockerService {
            hostname: Some(config_data.service_name.clone()),
            container_name: Some(format!(
                "{}-{}",
                config_data.app_name, config_data.service_name
            )),
            restart: Some("always".to_string()),
            build: Some(DockerBuild {
                context: format!("./{}", config_data.service_name),
                dockerfile: format!("./Dockerfile.dev"),
            }),
            image: Some(format!(
                "{}_{}:latest",
                config_data.app_name, config_data.service_name
            )),
            environment: Some(environment),
            depends_on: Some(vec!["postgres".to_string(), "redis".to_string()]),
            ports: Some(vec![format!("{}:{}", port_number, port_number)]),
            networks: Some(vec![format!("{}-network", config_data.app_name)]),
            volumes: Some(vec![format!(
                "{}:{}",
                config_data.service_name, config_data.service_name
            )]),
        },
    );

    full_docker_compose["services"] = to_value(docker_compose.services)?;

    Ok((to_string(&full_docker_compose)?, port_number))
}
