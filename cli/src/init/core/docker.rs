use std::{fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string, to_value, Value};

use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
    },
    init::service::ServiceConfigData,
};

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    working_dir: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    entrypoint: Option<Vec<String>>,
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
    let mut full_docker_compose: Value = from_str(
        &read_to_string(Path::new(base_path).join("docker-compose.yaml"))
            .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;
    let mut docker_compose: DockerCompose = Deserialize::deserialize(&full_docker_compose)
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;

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
            if container_name
                == &format!(
                    "{}-{}-{}",
                    config_data.app_name, config_data.service_name, config_data.runtime
                )
            {
                return Ok((
                    to_string(&full_docker_compose)
                        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?,
                    port_number,
                ));
            }
        }
    }

    port_number += 1;

    let mut environment = IndexMap::new();
    environment.insert("ENV".to_string(), "development".to_string());
    environment.insert("HOST".to_string(), "0.0.0.0".to_string());
    environment.insert("PORT".to_string(), format!("{}", port_number));
    // TODO: support other databases
    environment.insert(
        "DB_NAME".to_string(),
        format!("{}-dev", config_data.app_name),
    );
    environment.insert("DB_HOST".to_string(), "postgres".to_string());
    environment.insert("DB_USER".to_string(), "postgres".to_string());
    environment.insert("DB_PASSWORD".to_string(), "postgres".to_string());
    environment.insert("DB_PORT".to_string(), "5432".to_string());
    environment.insert("REDIS_URL".to_string(), "redis://redis:6379".to_string());

    let mut volumes = vec![
        format!(
            "./{}:/{}/{}",
            config_data.service_name, config_data.app_name, config_data.service_name
        ),
        format!(
            "/{}/{}/dist",
            config_data.app_name, config_data.service_name
        ),
    ];
    if config_data.runtime == "node" {
        volumes.push(format!(
            "/{}/{}/node_modules",
            config_data.app_name, config_data.service_name
        ));
    }

    docker_compose.services.insert(
        config_data.service_name.clone(),
        DockerService {
            hostname: Some(config_data.service_name.clone()),
            container_name: Some(format!(
                "{}-{}-{}",
                config_data.app_name, config_data.service_name, config_data.runtime
            )),
            restart: Some("always".to_string()),
            build: Some(DockerBuild {
                context: ".".to_string(),
                dockerfile: format!("./Dockerfile"),
            }),
            image: Some(format!(
                "{}_{}_{}",
                config_data.app_name, config_data.service_name, config_data.runtime
            )),
            environment: Some(environment),
            depends_on: Some(vec!["postgres".to_string(), "redis".to_string()]),
            ports: Some(vec![format!("{}:{}", port_number, port_number)]),
            networks: Some(vec![format!("{}-network", config_data.app_name)]),
            volumes: Some(volumes),
            working_dir: Some(format!(
                "/{}/{}",
                config_data.app_name, config_data.service_name
            )),
            entrypoint: Some(vec![
                match config_data.runtime.as_str() {
                    "node" => "pnpm".to_string(),
                    "bun" => "bun".to_string(),
                    _ => unreachable!(),
                },
                "run".to_string(),
                "dev".to_string(),
            ]),
        },
    );

    full_docker_compose["services"] = to_value(docker_compose.services)?;

    Ok((
        to_string(&full_docker_compose)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?,
        port_number,
    ))
}
