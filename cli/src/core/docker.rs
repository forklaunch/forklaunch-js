use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_yml::{from_str, to_string, to_value, Value};

use super::manifest::ManifestData;
use crate::{
    constants::{
        Database, ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_DOCKER_COMPOSE,
    },
    core::manifest::{service::ServiceManifestData, worker::WorkerManifestData},
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

#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) struct DockerCompose {
    volumes: IndexMap<String, DockerVolume>,
    networks: IndexMap<String, DockerNetwork>,
    services: IndexMap<String, DockerService>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct Healthcheck {
    test: String,
    interval: String,
    timeout: String,
    retries: i32,
    start_period: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
enum Command {
    Simple(String),
    Multiple(Vec<String>),
}

#[derive(Debug, Serialize, Deserialize)]
enum Restart {
    #[serde(rename = "always")]
    Always,
    #[serde(rename = "unless-stopped")]
    UnlessStopped,
    #[serde(rename = "no")]
    No,
}

#[derive(Debug, Serialize, Deserialize)]
enum DependencyCondition {
    #[serde(rename = "service_started")]
    ServiceStarted,
    #[serde(rename = "service_healthy")]
    ServiceHealthy,
    #[serde(rename = "service_completed_successfully")]
    ServiceCompletedSuccessfully,
}

#[derive(Debug, Serialize, Deserialize)]
struct DependsOn {
    condition: DependencyCondition,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct DockerService {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hostname: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    container_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    restart: Option<Restart>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    build: Option<DockerBuild>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    environment: Option<IndexMap<String, String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    depends_on: Option<IndexMap<String, DependsOn>>,
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
    command: Option<Command>,
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

#[derive(Debug, Serialize, Deserialize)]
struct DockerNetwork {
    name: String,
    driver: String,
}

pub(crate) fn add_otel_to_docker_compose<'a>(
    app_name: &str,
    docker_compose: &'a mut DockerCompose,
) -> Result<&'a mut DockerCompose> {
    docker_compose.services.insert(
        "tempo".to_string(),
        DockerService {
            image: Some("grafana/tempo:latest".to_string()),
            command: Some(Command::Simple("-config.file=/etc/tempo.yaml".to_string())),
            ports: Some(vec!["3200:3200".to_string(), "4317:4317".to_string()]),
            volumes: Some(vec!["./monitoring/tempo.yaml:/etc/tempo.yaml".to_string()]),
            networks: Some(vec![format!("{}-network", app_name)]),
            ..Default::default()
        },
    );

    docker_compose.services.insert(
        "loki".to_string(),
        DockerService {
            image: Some("grafana/loki:latest".to_string()),
            ports: Some(vec!["3100:3100".to_string()]),
            networks: Some(vec![format!("{}-network", app_name)]),
            ..Default::default()
        },
    );

    docker_compose.services.insert(
        "prometheus".to_string(),
        DockerService {
            image: Some("prom/prometheus:latest".to_string()),
            ports: Some(vec!["9090:9090".to_string()]),
            volumes: Some(vec![
                "./monitoring/prometheus.yaml:/etc/prometheus/prometheus.yml".to_string(),
            ]),
            networks: Some(vec![format!("{}-network", app_name)]),
            ..Default::default()
        },
    );

    docker_compose.services.insert(
        "grafana".to_string(),
        DockerService {
            image: Some("grafana/grafana:latest".to_string()),
            ports: Some(vec!["3000:3000".to_string()]),
            volumes: Some(vec![
                "./monitoring/grafana-provisioning/datasources:/etc/grafana/provisioning/datasources".to_string(),
                "./monitoring/grafana-provisioning/dashboards:/etc/grafana/provisioning/dashboards".to_string()
            ]),
            networks: Some(vec![format!("{}-network", app_name)]),
            ..Default::default()
        },
    );

    docker_compose.services.insert(
        "otel-collector".to_string(),
        DockerService {
            image: Some("otel/opentelemetry-collector:latest".to_string()),
            command: Some(Command::Simple(
                "--config=/etc/otel-collector-config.yaml".to_string(),
            )),
            ports: Some(vec!["4318:4318".to_string(), "8889:8889".to_string()]),
            volumes: Some(vec![
                "./monitoring/otel-collector-config.yaml:/etc/otel-collector-config.yaml"
                    .to_string(),
            ]),
            networks: Some(vec![format!("{}-network", app_name)]),
            ..Default::default()
        },
    );

    Ok(docker_compose)
}

fn add_redis_to_docker_compose<'a>(
    app_name: &str,
    docker_compose: &'a mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<&'a mut DockerCompose> {
    environment.insert("REDIS_URL".to_string(), "redis://redis:6379".to_string());
    if !docker_compose.services.contains_key("redis") {
        docker_compose.services.insert(
            "redis".to_string(),
            DockerService {
                image: Some("redis/redis-stack-server:latest".to_string()),
                container_name: Some(format!("{}-redis", app_name)),
                restart: Some(Restart::Always),
                ports: Some(vec!["6379:6379".to_string()]),
                networks: Some(vec![format!("{}-network", app_name)]),
                ..Default::default()
            },
        );
    }
    Ok(docker_compose)
}

fn add_kafka_to_docker_compose<'a>(
    app_name: &str,
    project_name: &str,
    docker_compose: &'a mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<&'a mut DockerCompose> {
    environment.insert("KAFKA_BROKERS".to_string(), "kafka:29092".to_string());
    environment.insert(
        "KAFKA_CLIENT_ID".to_string(),
        format!("{}-kafka-{}-client", app_name, project_name),
    );
    environment.insert(
        "KAFKA_GROUP_ID".to_string(),
        format!("{}-kafka-group", app_name),
    );
    docker_compose.services.insert(
        "zookeeper".to_string(),
        DockerService {
            image: Some("confluentinc/cp-zookeeper:latest".to_string()),
            container_name: Some(format!("{}-zookeeper", app_name)),
            environment: Some(IndexMap::from([
                ("ZOOKEEPER_CLIENT_PORT".to_string(), "2181".to_string()),
                ("ZOOKEEPER_TICK_TIME".to_string(), "2000".to_string()),
            ])),
            ports: Some(vec!["2181:2181".to_string()]),
            networks: Some(vec![format!("{}-network", app_name)]),
            healthcheck: Some(Healthcheck {
                test: "echo srvr | nc localhost 2181 || exit 1".to_string(),
                interval: "10s".to_string(),
                timeout: "5s".to_string(),
                retries: 5,
                start_period: "10s".to_string(),
            }),
            ..Default::default()
        },
    );

    docker_compose.services.insert(
        "kafka".to_string(),
        DockerService {
            image: Some("confluentinc/cp-kafka:latest".to_string()),
            hostname: Some("kafka".to_string()),
            container_name: Some(format!("{}-kafka", app_name)),
            depends_on: Some(IndexMap::from([(
                "zookeeper".to_string(),
                DependsOn {
                    condition: DependencyCondition::ServiceStarted,
                },
            )])),
            ports: Some(vec!["9092:9092".to_string(), "29092:29092".to_string()]),
            environment: Some(IndexMap::from([
                (
                    "KAFKA_ZOOKEEPER_CONNECT".to_string(),
                    "zookeeper:2181".to_string(),
                ),
                ("KAFKA_BROKER_ID".to_string(), "1".to_string()),
                (
                    "KAFKA_LISTENERS".to_string(),
                    "PLAINTEXT://kafka:29092,PLAINTEXT_HOST://0.0.0.0:9092".to_string(),
                ),
                (
                    "KAFKA_ADVERTISED_LISTENERS".to_string(),
                    "PLAINTEXT://kafka:29092,PLAINTEXT_HOST://0.0.0.0:9092".to_string(),
                ),
                (
                    "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP".to_string(),
                    "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT".to_string(),
                ),
                (
                    "KAFKA_INTER_BROKER_LISTENER_NAME".to_string(),
                    "PLAINTEXT".to_string(),
                ),
                (
                    "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR".to_string(),
                    "1".to_string(),
                ),
                (
                    "KAFKA_AUTO_CREATE_TOPICS_ENABLE".to_string(),
                    "true".to_string(),
                ),
                ("KAFKA_NUM_PARTITIONS".to_string(), "1".to_string()),
                (
                    "KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS".to_string(),
                    "0".to_string(),
                ),
            ])),
            networks: Some(vec![format!("{}-network", app_name)]),
            healthcheck: Some(Healthcheck {
                test:
                    "kafka-topics --bootstrap-server kafka:29092 --list >/dev/null 2>&1 || exit 1"
                        .to_string(),
                interval: "10s".to_string(),
                timeout: "10s".to_string(),
                retries: 5,
                start_period: "15s".to_string(),
            }),
            ..Default::default()
        },
    );

    Ok(docker_compose)
}

fn add_database_to_docker_compose(
    config_data: &ManifestData,
    docker_compose: &mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<()> {
    if let ManifestData::Worker(worker_data) = config_data {
        if !worker_data.is_database_enabled {
            return Ok(());
        }
    }

    let app_name = match config_data {
        ManifestData::Service(service_data) => &service_data.app_name,
        ManifestData::Worker(worker_data) => &worker_data.app_name,
        _ => unreachable!(),
    };

    let database = match config_data {
        ManifestData::Service(service_data) => &service_data.database,
        ManifestData::Worker(worker_data) => &worker_data.database.as_ref().unwrap(),
        _ => unreachable!(),
    };

    let name = match config_data {
        ManifestData::Service(service_data) => &service_data.service_name,
        ManifestData::Worker(worker_data) => &worker_data.worker_name,
        _ => unreachable!(),
    };

    let mut active_databases = HashSet::new();
    for (_, service) in docker_compose.services.iter_mut() {
        if let Some(container_name) = &service.container_name {
            if Database::VARIANTS.contains(&container_name.as_str()) {
                active_databases.insert(container_name.as_str());
            }
        }
    }

    if !active_databases.contains(&database.as_str()) {
        match database.parse()? {
            Database::PostgreSQL => {
                docker_compose.services.insert(
                    "postgresql".to_string(),
                    DockerService {
                        image: Some("postgres:latest".to_string()),
                        container_name: Some(format!("{}-postgresql", app_name)),
                        hostname: Some("postgresql".to_string()),
                        restart: Some(Restart::UnlessStopped),
                        ports: Some(vec!["5432:5432".to_string()]),
                        environment: Some(IndexMap::from([
                            ("POSTGRES_USER".to_string(), "postgresql".to_string()),
                            ("POSTGRES_PASSWORD".to_string(), "postgresql".to_string()),
                            ("POSTGRES_HOST_AUTH_METHOD".to_string(), "trust".to_string()),
                        ])),
                        networks: Some(vec![format!("{}-network", app_name)]),
                        volumes: Some(vec![format!(
                            "{}-postgresql-data:/var/lib/postgresql/{}/data",
                            app_name, app_name
                        )]),
                        ..Default::default()
                    },
                );
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.insert("DB_HOST".to_string(), "postgresql".to_string());
                environment.insert("DB_USER".to_string(), "postgresql".to_string());
                environment.insert("DB_PASSWORD".to_string(), "postgresql".to_string());
                environment.insert("DB_PORT".to_string(), "5432".to_string());
                docker_compose.volumes.insert(
                    format!("{}-postgresql-data", app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            Database::MongoDB => {
                docker_compose.services.insert(
                    "mongodb".to_string(),
                    DockerService {
                        image: Some("mongo:latest".to_string()),
                        hostname: Some("mongodb".to_string()),
                        container_name: Some(format!("{}-mongodb", app_name)),
                        restart: Some(Restart::UnlessStopped),
                        command: Some(Command::Multiple(vec![
                            "--replSet".to_string(),
                            "rs0".to_string(),
                            "--logpath".to_string(),
                            "/var/log/mongodb/mongod.log".to_string(),
                        ])),
                        environment: Some(IndexMap::from([(
                            "MONGO_INITDB_DATABASE".to_string(),
                            format!("{}-dev", app_name),
                        )])),
                        ports: Some(vec!["27017:27017".to_string()]),
                        networks: Some(vec![format!("{}-network", app_name)]),
                        volumes: Some(vec![format!("{}-mongodb-data:/data/db", app_name)]),
                        healthcheck: Some(Healthcheck {
                            test: "mongosh --eval 'db.runCommand(\"ping\").ok' localhost:27017/test --quiet".to_string(),
                            interval: "2s".to_string(),
                            timeout: "3s".to_string(),
                            retries: 5,
                            start_period: "3s".to_string(),
                        }),
                        ..Default::default()
                    },
                );
                docker_compose.services.insert(
                    "mongo-init".to_string(),
                    DockerService {
                        image: Some("mongo:latest".to_string()),
                        depends_on: Some(IndexMap::from([(
                            "mongodb".to_string(),
                            DependsOn {
                                condition: DependencyCondition::ServiceStarted,
                            },
                        )])),
                        networks: Some(vec![format!("{}-network", app_name)]),
                        command: Some(Command::Simple(MONGO_INIT_COMMAND.to_string())),
                        ..Default::default()
                    },
                );
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.insert("DB_HOST".to_string(), "mongodb".to_string());
                environment.insert("DB_USER".to_string(), "mongodb".to_string());
                environment.insert("DB_PASSWORD".to_string(), "mongodb".to_string());
                environment.insert("DB_PORT".to_string(), "27017".to_string());
                docker_compose.volumes.insert(
                    format!("{}-mongodb-data", app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            Database::MySQL => {
                docker_compose.services.insert(
                    "mysql".to_string(),
                    DockerService {
                        image: Some("mysql:latest".to_string()),
                        container_name: Some(format!("{}-mysql", app_name)),
                        hostname: Some("mysql".to_string()),
                        restart: Some(Restart::UnlessStopped),
                        ports: Some(vec!["3306:3306".to_string()]),
                        environment: Some(IndexMap::from([
                            ("MYSQL_ROOT_PASSWORD".to_string(), "mysql".to_string()),
                            ("MYSQL_USER".to_string(), "mysql".to_string()),
                            ("MYSQL_PASSWORD".to_string(), "mysql".to_string()),
                            ("MYSQL_DATABASE".to_string(), format!("{}-dev", app_name)),
                        ])),
                        networks: Some(vec![format!("{}-network", app_name)]),
                        volumes: Some(vec![format!("{}-mysql-data:/var/lib/mysql", app_name)]),
                        ..Default::default()
                    },
                );
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.insert("DB_HOST".to_string(), "mysql".to_string());
                environment.insert("DB_USER".to_string(), "mysql".to_string());
                environment.insert("DB_PASSWORD".to_string(), "mysql".to_string());
                environment.insert("DB_PORT".to_string(), "3306".to_string());
                docker_compose.volumes.insert(
                    format!("{}-mysql-data", app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            Database::MariaDB => {
                docker_compose.services.insert(
                    "mariadb".to_string(),
                    DockerService {
                        image: Some("mariadb:latest".to_string()),
                        container_name: Some(format!("{}-mariadb", app_name)),
                        hostname: Some("mariadb".to_string()),
                        restart: Some(Restart::UnlessStopped),
                        ports: Some(vec!["3306:3306".to_string()]),
                        environment: Some(IndexMap::from([
                            ("MARIADB_ROOT_PASSWORD".to_string(), "mariadb".to_string()),
                            ("MARIADB_USER".to_string(), "mariadb".to_string()),
                            ("MARIADB_PASSWORD".to_string(), "mariadb".to_string()),
                            ("MARIADB_DATABASE".to_string(), format!("{}-dev", app_name)),
                        ])),
                        networks: Some(vec![format!("{}-network", app_name)]),
                        volumes: Some(vec![format!("{}-mariadb-data:/var/lib/mysql", app_name)]),
                        ..Default::default()
                    },
                );
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.insert("DB_HOST".to_string(), "mariadb".to_string());
                environment.insert("DB_USER".to_string(), "mariadb".to_string());
                environment.insert("DB_PASSWORD".to_string(), "mariadb".to_string());
                environment.insert("DB_PORT".to_string(), "3306".to_string());
                docker_compose.volumes.insert(
                    format!("{}-mariadb-data", app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            Database::MsSQL => {
                docker_compose.services.insert(
                    "mssql".to_string(),
                    DockerService {
                        image: Some("mcr.microsoft.com/mssql/server:latest".to_string()),
                        container_name: Some(format!("{}-mssql", app_name)),
                        hostname: Some("mssql".to_string()),
                        restart: Some(Restart::UnlessStopped),
                        ports: Some(vec!["1433:1433".to_string()]),
                        environment: Some(IndexMap::from([
                            ("ACCEPT_EULA".to_string(), "Y".to_string()),
                            ("SA_PASSWORD".to_string(), "Mssql123!".to_string()),
                            ("MSSQL_PID".to_string(), "Developer".to_string()),
                        ])),
                        networks: Some(vec![format!("{}-network", app_name)]),
                        volumes: Some(vec![format!("{}-mssql-data:/var/opt/mssql", app_name)]),
                        ..Default::default()
                    },
                );
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.insert("DB_HOST".to_string(), "mssql".to_string());
                environment.insert("DB_USER".to_string(), "sa".to_string());
                environment.insert("DB_PASSWORD".to_string(), "Mssql123!".to_string());
                environment.insert("DB_PORT".to_string(), "1433".to_string());
                docker_compose.volumes.insert(
                    format!("{}-mssql-data", app_name),
                    DockerVolume {
                        driver: "local".to_string(),
                    },
                );
            }
            Database::SQLite => {
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.shift_remove("DB_HOST");
                environment.shift_remove("DB_USER");
                environment.shift_remove("DB_PASSWORD");
                environment.shift_remove("DB_PORT");
            }
            Database::BetterSQLite => {
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.shift_remove("DB_HOST");
                environment.shift_remove("DB_USER");
                environment.shift_remove("DB_PASSWORD");
                environment.shift_remove("DB_PORT");
            }
            Database::LibSQL => {
                environment.insert("DB_NAME".to_string(), format!("{}-{}-dev", app_name, name));
                environment.shift_remove("DB_HOST");
                environment.shift_remove("DB_USER");
                environment.shift_remove("DB_PASSWORD");
                environment.shift_remove("DB_PORT");
            }
        }
    }

    Ok(())
}

fn add_base_definition_to_docker_compose(
    app_name: &str,
    name: &str,
    base_path: &String,
    docker_compose_string: Option<String>,
) -> Result<(Value, DockerCompose, i32, IndexMap<String, String>)> {
    let full_docker_compose: Value =
        if let Some(inner_docker_compose_string) = docker_compose_string {
            from_str(&inner_docker_compose_string)
                .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?
        } else {
            from_str(
                &read_to_string(Path::new(base_path).join("docker-compose.yaml"))
                    .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?
        };

    let mut docker_compose: DockerCompose = Deserialize::deserialize(&full_docker_compose)
        .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?;

    let network_name = format!("{}-network", app_name);
    if !docker_compose.networks.contains_key(&network_name) {
        docker_compose.networks.insert(
            network_name.clone(),
            DockerNetwork {
                name: network_name,
                driver: "bridge".to_string(),
            },
        );
    }

    let mut port_number = 8000 - 1;
    for (_, value) in docker_compose.services.iter() {
        if let Some(ports) = &value.ports {
            for port in ports {
                if let Some(port_num) = port.split(':').next() {
                    if let Ok(num) = port_num.parse::<i32>() {
                        if num >= 8000 && num <= 9000 && num > port_number && num != 8889 {
                            port_number = num;
                        }
                    }
                }
            }
        }
    }

    port_number += 1;

    let mut environment = IndexMap::new();
    environment.insert("ENV".to_string(), "development".to_string());
    environment.insert("HOST".to_string(), "0.0.0.0".to_string());
    environment.insert("PROTOCOL".to_string(), "http".to_string());
    environment.insert("PORT".to_string(), port_number.to_string());
    environment.insert("VERSION".to_string(), "v1".to_string());
    environment.insert("DOCS_PATH".to_string(), "/docs".to_string());
    environment.insert(
        "OTEL_EXPORTER_OTLP_ENDPOINT".to_string(),
        "http://otel-collector:4318".to_string(),
    );
    environment.insert(
        "OTEL_SERVICE_NAME".to_string(),
        format!("{}-{}", app_name, name),
    );

    Ok((
        full_docker_compose,
        docker_compose,
        port_number,
        environment,
    ))
}

fn create_base_service(
    app_name: &str,
    component_name: &str,
    runtime: &str,
    database: &Option<String>,
    port_number: Option<i32>,
    environment: IndexMap<String, String>,
    volumes: Vec<String>,
    container_name_suffix: Option<&str>,
    entrypoint_command: &str,
    depends_on: Vec<String>,
) -> DockerService {
    DockerService {
        hostname: Some(component_name.to_string()),
        container_name: Some(format!(
            "{}-{}-{}{}",
            app_name,
            component_name,
            runtime,
            container_name_suffix.map_or_else(|| "".to_string(), |suffix| format!("-{}", suffix))
        )),
        restart: Some(Restart::Always),
        build: Some(DockerBuild {
            context: ".".to_string(),
            dockerfile: format!("./Dockerfile"),
        }),
        image: Some(format!(
            "{}-{}-{}:latest",
            app_name, component_name, runtime
        )),
        environment: Some(environment),
        depends_on: Some(
            vec![database.clone().unwrap(), "redis".to_string()]
                .into_iter()
                .chain(depends_on)
                .map(|service_name| {
                    (
                        service_name,
                        DependsOn {
                            condition: DependencyCondition::ServiceStarted,
                        },
                    )
                })
                .collect(),
        ),
        ports: if let Some(port_number) = port_number {
            Some(vec![format!("{}:{}", port_number, port_number)])
        } else {
            None
        },
        networks: Some(vec![format!("{}-network", app_name)]),
        volumes: Some(volumes),
        working_dir: Some(format!("/{}/{}", app_name, component_name)),
        entrypoint: Some(vec![
            match runtime {
                "node" => "pnpm".to_string(),
                "bun" => "bun".to_string(),
                _ => unreachable!(),
            },
            "run".to_string(),
            entrypoint_command.to_string(),
        ]),
        ..Default::default()
    }
}

pub(crate) fn add_service_definition_to_docker_compose(
    config_data: &ServiceManifestData,
    base_path: &String,
    docker_compose_string: Option<String>,
) -> Result<String> {
    let (mut full_docker_compose, mut docker_compose, port_number, mut environment) =
        add_base_definition_to_docker_compose(
            &config_data.app_name,
            &config_data.service_name,
            base_path,
            docker_compose_string,
        )?;

    if config_data.service_name == "iam" {
        environment.insert(
            "PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH".to_string(),
            "./public.pem".to_string(),
        );
    }

    if config_data.is_cache_enabled {
        add_redis_to_docker_compose(&config_data.app_name, &mut docker_compose, &mut environment)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    }

    add_database_to_docker_compose(
        &ManifestData::Service(config_data),
        &mut docker_compose,
        &mut environment,
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;

    let volumes = vec![
        format!(
            "./{}:/{}/{}",
            config_data.service_name, config_data.app_name, config_data.service_name
        ),
        format!(
            "/{}/{}/dist",
            config_data.app_name, config_data.service_name
        ),
        format!(
            "/{}/{}/node_modules",
            config_data.app_name, config_data.service_name
        ),
        format!("/{}/core/node_modules", config_data.app_name),
        format!("/{}/node_modules", config_data.app_name),
    ];

    let service_name = config_data.service_name.clone();
    if !docker_compose.services.contains_key(&service_name) {
        docker_compose.services.insert(
            service_name,
            create_base_service(
                &config_data.app_name,
                &config_data.service_name,
                &config_data.runtime,
                &Some(config_data.database.clone()),
                Some(port_number),
                environment,
                volumes,
                None,
                "dev",
                vec![],
            ),
        );
    }

    full_docker_compose["volumes"] = to_value(docker_compose.volumes)?;
    full_docker_compose["services"] = to_value(docker_compose.services)?;
    full_docker_compose["networks"] = to_value(docker_compose.networks)?;

    Ok(to_string(&full_docker_compose)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?)
}

pub(crate) fn add_worker_definition_to_docker_compose(
    config_data: &WorkerManifestData,
    base_path: &String,
    docker_compose_string: Option<String>,
) -> Result<String> {
    let (mut full_docker_compose, mut docker_compose, port_number, mut environment) =
        add_base_definition_to_docker_compose(
            &config_data.app_name,
            &config_data.worker_name,
            base_path,
            docker_compose_string,
        )?;

    if config_data.is_cache_enabled {
        add_redis_to_docker_compose(&config_data.app_name, &mut docker_compose, &mut environment)
            .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    } else if config_data.is_database_enabled {
        add_database_to_docker_compose(
            &ManifestData::Worker(config_data),
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    } else if config_data.is_kafka_enabled {
        add_kafka_to_docker_compose(
            &config_data.app_name,
            &config_data.worker_name,
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    }

    let volumes = vec![
        format!(
            "./{}:/{}/{}",
            config_data.worker_name, config_data.app_name, config_data.worker_name
        ),
        format!("/{}/{}/dist", config_data.app_name, config_data.worker_name),
        format!(
            "/{}/{}/node_modules",
            config_data.app_name, config_data.worker_name
        ),
        format!("/{}/core/node_modules", config_data.app_name),
        format!("/{}/node_modules", config_data.app_name),
    ];

    let server_service_name = format!("{}-server", config_data.worker_name);
    if !docker_compose.services.contains_key(&server_service_name) {
        docker_compose.services.insert(
            server_service_name.clone(),
            create_base_service(
                &config_data.app_name,
                &config_data.worker_name,
                &config_data.runtime,
                &config_data.database,
                Some(port_number),
                environment.clone(),
                volumes.clone(),
                Some("server"),
                "dev:server",
                vec![],
            ),
        );
    }

    let worker_service_name = format!("{}-worker", config_data.worker_name);
    if !docker_compose.services.contains_key(&worker_service_name) {
        docker_compose.services.insert(
            worker_service_name.clone(),
            create_base_service(
                &config_data.app_name,
                &config_data.worker_name,
                &config_data.runtime,
                &config_data.database,
                None,
                environment,
                volumes,
                Some("worker"),
                "dev:worker",
                vec![server_service_name.clone()],
            ),
        );
    }

    full_docker_compose["volumes"] = to_value(docker_compose.volumes)?;
    full_docker_compose["services"] = to_value(docker_compose.services)?;
    full_docker_compose["networks"] = to_value(docker_compose.networks)?;

    Ok(to_string(&full_docker_compose)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?)
}
