use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string, to_value, Value};

use crate::{
    constants::{
        ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_DOCKER_COMPOSE, VALID_DATABASES,
    },
    init::service::ServiceConfigData,
};

const MONGO_INIT_COMMAND: &str = r#"sh -c "sleep 5; mongosh --host mongodb:27017 --eval '
rs.initiate({
    _id: \"rs0\",
    members: [
        { _id: 0, host: \"mongodb:27017\" }
    ]
});
while (!rs.isMaster().ismaster) {
    print(\"Waiting for replica set initialization...\");
    sleep(1000);
}
print(\"Replica set initialized and primary elected\");
db.getSiblingDB(\"admin\").createUser({
    user: \"mongodb\",
    pwd: \"mongodb\",
    roles: [{ role: \"root\", db: \"admin\" }]
});
'""#;

#[derive(Debug, Serialize, Deserialize)]
struct DockerCompose {
    volumes: IndexMap<String, DockerVolume>,
    services: IndexMap<String, DockerService>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct Healthcheck {
    test: String,
    interval: String,
    timeout: String,
    retries: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
enum Command {
    Simple(String),
    Multiple(Vec<String>),
}

#[derive(Debug, Serialize, Deserialize, Default)]
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
    command: Option<Command>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    healthcheck: Option<Healthcheck>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct DockerVolume {
    driver: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DockerBuild {
    context: String,
    dockerfile: String,
}

fn add_database_to_docker_compose(
    config_data: &ServiceConfigData,
    docker_compose: &mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<()> {
    let mut active_databases = HashSet::new();
    for (_, service) in docker_compose.services.iter_mut() {
        if VALID_DATABASES.contains(&service.container_name.as_deref().unwrap()) {
            active_databases.insert(service.container_name.as_deref().unwrap());
        }
    }

    if !active_databases.contains(&config_data.database.as_str()) {
        match config_data.database.as_str() {
            "postgresql" => {
                docker_compose.services.insert(
                    "postgresql".to_string(),
                    DockerService {
                        image: Some("postgres:latest".to_string()),
                        container_name: Some(format!("{}-postgresql", config_data.app_name)),
                        hostname: Some("postgresql".to_string()),
                        restart: Some("unless-stopped".to_string()),
                        ports: Some(vec!["5432:5432".to_string()]),
                        environment: Some(IndexMap::from([
                            ("POSTGRES_USER".to_string(), "postgresql".to_string()),
                            ("POSTGRES_PASSWORD".to_string(), "postgresql".to_string()),
                            ("POSTGRES_HOST_AUTH_METHOD".to_string(), "trust".to_string()),
                        ])),
                        networks: Some(vec![format!("{}-network", config_data.app_name)]),
                        volumes: Some(vec![format!(
                            "./{}/data:/var/lib/postgresql/forklaunch/data",
                            config_data.app_name
                        )]),
                        ..Default::default()
                    },
                );
                environment.insert("DB_HOST".to_string(), "postgresql".to_string());
                environment.insert("DB_USER".to_string(), "postgresql".to_string());
                environment.insert("DB_PASSWORD".to_string(), "postgresql".to_string());
                environment.insert("DB_PORT".to_string(), "5432".to_string());
                docker_compose.volumes.insert(
                    format!("{}-postgresql-data", config_data.app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            "mongodb" => {
                docker_compose.services.insert(
                    "mongodb".to_string(),
                    DockerService {
                        image: Some("mongo:latest".to_string()),
                        hostname: Some("mongodb".to_string()),
                        container_name: Some(format!("{}-mongodb", config_data.app_name)),
                        restart: Some("unless-stopped".to_string()),
                        command: Some(Command::Multiple(vec![
                            "--replSet".to_string(),
                            "rs0".to_string(),
                            "--logpath".to_string(),
                            "/var/log/mongodb/mongod.log".to_string(),
                        ])),
                        environment: Some(IndexMap::from([(
                            "MONGO_INITDB_DATABASE".to_string(),
                            format!("{}-dev", config_data.app_name),
                        )])),
                        ports: Some(vec!["27017:27017".to_string()]),
                        networks: Some(vec![format!("{}-network", config_data.app_name)]),
                        volumes: Some(vec![format!("./{}/data:/data/db", config_data.app_name)]),
                        healthcheck: Some(Healthcheck {
                            test: "mongosh --eval 'db.runCommand(\"ping\").ok' localhost:27017/test --quiet".to_string(),
                            interval: "2s".to_string(),
                            timeout: "3s".to_string(),
                            retries: 5,
                        }),
                        ..Default::default()
                    },
                );
                docker_compose.services.insert(
                    "mongo-init".to_string(),
                    DockerService {
                        image: Some("mongo:latest".to_string()),
                        depends_on: Some(vec!["mongodb".to_string()]),
                        networks: Some(vec![format!("{}-network", config_data.app_name)]),
                        command: Some(Command::Simple(MONGO_INIT_COMMAND.to_string())),
                        ..Default::default()
                    },
                );
                environment.insert("DB_HOST".to_string(), "mongodb".to_string());
                environment.insert("DB_USER".to_string(), "mongodb".to_string());
                environment.insert("DB_PASSWORD".to_string(), "mongodb".to_string());
                environment.insert("DB_PORT".to_string(), "27017".to_string());
                docker_compose.volumes.insert(
                    format!("{}-mongodb-data", config_data.app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            _ => unreachable!(),
        }
    }

    Ok(())
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

    // TODO: support other caches and only include if relevant
    environment.insert("REDIS_URL".to_string(), "redis://redis:6379".to_string());

    add_database_to_docker_compose(config_data, &mut docker_compose, &mut environment)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;

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
    // if config_data.runtime == "node" {
    volumes.push(format!(
        "/{}/{}/node_modules",
        config_data.app_name, config_data.service_name
    ));
    volumes.push(format!("/{}/core/node_modules", config_data.app_name));
    volumes.push(format!("/{}/node_modules", config_data.app_name));
    // }

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
                context: "".to_string(),
                dockerfile: format!("./Dockerfile"),
            }),
            image: Some(format!(
                "{}-{}-{}",
                config_data.app_name, config_data.service_name, config_data.runtime
            )),
            environment: Some(environment),
            depends_on: Some(vec![config_data.database.clone(), "redis".to_string()]),
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
            ..Default::default()
        },
    );

    full_docker_compose["volumes"] = to_value(docker_compose.volumes)?;
    full_docker_compose["services"] = to_value(docker_compose.services)?;

    Ok((
        to_string(&full_docker_compose)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?,
        port_number,
    ))
}
