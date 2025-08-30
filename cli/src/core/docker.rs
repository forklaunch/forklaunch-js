use std::{
    collections::{HashMap, HashSet},
    fs::read_to_string,
    path::Path,
};

use anyhow::{Context, Result};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_yml::{Value, from_str, from_value, to_string};

use super::manifest::{ManifestData, ProjectEntry};
use crate::{
    constants::{
        Database, ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE,
        ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE, ERROR_FAILED_TO_READ_DOCKER_COMPOSE, Infrastructure,
        Runtime, WorkerType,
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

#[derive(Debug, Serialize, Default)]
pub(crate) struct DockerCompose {
    pub(crate) volumes: IndexMap<String, DockerVolume>,
    pub(crate) networks: IndexMap<String, DockerNetwork>,
    pub(crate) services: IndexMap<String, DockerService>,

    #[serde(flatten)]
    pub(crate) additional_entries: HashMap<String, Value>,
}

impl<'de> Deserialize<'de> for DockerCompose {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{MapAccess, Visitor};

        struct DockerComposeVisitor;

        impl<'de> Visitor<'de> for DockerComposeVisitor {
            type Value = DockerCompose;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a docker-compose object")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut compose = DockerCompose::default();

                while let Some((key, value)) = access.next_entry::<String, Value>()? {
                    match key.as_str() {
                        "volumes" => {
                            compose.volumes =
                                from_value(value).map_err(serde::de::Error::custom)?;
                        }
                        "networks" => {
                            compose.networks =
                                from_value(value).map_err(serde::de::Error::custom)?;
                        }
                        "services" => {
                            compose.services =
                                from_value(value).map_err(serde::de::Error::custom)?;
                        }
                        _ => {
                            compose.additional_entries.insert(key, value);
                        }
                    }
                }

                Ok(compose)
            }
        }

        deserializer.deserialize_map(DockerComposeVisitor)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub(crate) enum HealthTest {
    String(String),
    List(Vec<String>),
}

impl Default for HealthTest {
    fn default() -> Self {
        HealthTest::String(String::new())
    }
}

#[derive(Debug, Serialize, Default, Clone)]
pub(crate) struct Healthcheck {
    pub(crate) test: HealthTest,
    pub(crate) interval: String,
    pub(crate) timeout: String,
    pub(crate) retries: i32,
    pub(crate) start_period: String,

    #[serde(flatten)]
    pub(crate) additional_properties: HashMap<String, Value>,
}

impl<'de> Deserialize<'de> for Healthcheck {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{MapAccess, Visitor};

        struct HealthcheckVisitor;

        impl<'de> Visitor<'de> for HealthcheckVisitor {
            type Value = Healthcheck;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a healthcheck object")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut healthcheck = Healthcheck::default();
                let mut additional_properties = HashMap::new();

                while let Some((key, value)) = access.next_entry::<String, Value>()? {
                    match key.as_str() {
                        "test" => {
                            healthcheck.test =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "interval" => {
                            healthcheck.interval =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "timeout" => {
                            healthcheck.timeout =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "retries" => {
                            healthcheck.retries =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "start_period" => {
                            healthcheck.start_period =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        _ => {
                            additional_properties.insert(key, value);
                        }
                    }
                }

                healthcheck.additional_properties = additional_properties;
                Ok(healthcheck)
            }
        }

        deserializer.deserialize_map(HealthcheckVisitor)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub(crate) enum Command {
    Simple(String),
    Multiple(Vec<String>),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) enum Restart {
    #[serde(rename = "always")]
    Always,
    #[serde(rename = "unless-stopped")]
    UnlessStopped,
    #[serde(rename = "no")]
    No,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) enum DependencyCondition {
    #[serde(rename = "service_started")]
    ServiceStarted,
    #[serde(rename = "service_healthy")]
    ServiceHealthy,
    #[serde(rename = "service_completed_successfully")]
    ServiceCompletedSuccessfully,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct DependsOn {
    pub(crate) condition: DependencyCondition,
}

#[derive(Debug, Serialize, Default, Clone)]
pub(crate) struct DockerService {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) hostname: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) container_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) image: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) restart: Option<Restart>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) build: Option<DockerBuild>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) environment: Option<IndexMap<String, String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) depends_on: Option<IndexMap<String, DependsOn>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) ports: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) networks: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) volumes: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) working_dir: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) entrypoint: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) command: Option<Command>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) healthcheck: Option<Healthcheck>,

    #[serde(flatten)]
    pub(crate) additional_properties: HashMap<String, Value>,
}

impl<'de> Deserialize<'de> for DockerService {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{MapAccess, Visitor};

        struct DockerServiceVisitor;

        impl<'de> Visitor<'de> for DockerServiceVisitor {
            type Value = DockerService;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a docker service object")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut service = DockerService::default();
                let mut additional_properties = HashMap::new();

                while let Some((key, value)) = access.next_entry::<String, Value>()? {
                    match key.as_str() {
                        "hostname" => {
                            service.hostname =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "container_name" => {
                            service.container_name =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "image" => {
                            service.image = from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "restart" => {
                            service.restart = from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "build" => {
                            service.build = from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "environment" => {
                            service.environment =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "depends_on" => {
                            service.depends_on =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "ports" => {
                            service.ports = from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "networks" => {
                            service.networks =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "volumes" => {
                            service.volumes = from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "working_dir" => {
                            service.working_dir =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "entrypoint" => {
                            service.entrypoint =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "command" => {
                            service.command = from_value(value).map_err(serde::de::Error::custom)?
                        }
                        "healthcheck" => {
                            service.healthcheck =
                                from_value(value).map_err(serde::de::Error::custom)?
                        }
                        _ => {
                            additional_properties.insert(key, value);
                        }
                    }
                }

                service.additional_properties = additional_properties;
                Ok(service)
            }
        }

        deserializer.deserialize_map(DockerServiceVisitor)
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) struct DockerVolume {
    pub(crate) driver: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct DockerBuild {
    pub(crate) context: String,
    pub(crate) dockerfile: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct DockerNetwork {
    pub(crate) name: String,
    pub(crate) driver: String,
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
            healthcheck: Some(Healthcheck {
                test: HealthTest::List(vec![
                    "CMD".to_string(),
                    "wget".to_string(),
                    "--no-verbose".to_string(),
                    "--tries=1".to_string(),
                    "--spider".to_string(),
                    "http://localhost:3200/ready".to_string(),
                ]),
                interval: "30s".to_string(),
                timeout: "10s".to_string(),
                retries: 3,
                start_period: "60s".to_string(),
                additional_properties: HashMap::new(),
            }),
            ..Default::default()
        },
    );

    docker_compose.services.insert(
        "loki".to_string(),
        DockerService {
            image: Some("grafana/loki:latest".to_string()),
            ports: Some(vec!["3100:3100".to_string()]),
            networks: Some(vec![format!("{}-network", app_name)]),
            healthcheck: Some(Healthcheck {
                test: HealthTest::List(vec![
                    "CMD".to_string(),
                    "wget".to_string(),
                    "--no-verbose".to_string(),
                    "--tries=1".to_string(),
                    "--spider".to_string(),
                    "http://localhost:3100/ready".to_string(),
                ]),
                interval: "30s".to_string(),
                timeout: "10s".to_string(),
                retries: 3,
                start_period: "30s".to_string(),
                additional_properties: HashMap::new(),
            }),
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
            healthcheck: Some(Healthcheck {
                test: HealthTest::List(vec![
                    "CMD".to_string(),
                    "wget".to_string(),
                    "--no-verbose".to_string(),
                    "--tries=1".to_string(),
                    "--spider".to_string(),
                    "http://localhost:9090/-/healthy".to_string(),
                ]),
                interval: "30s".to_string(),
                timeout: "10s".to_string(),
                retries: 3,
                start_period: "30s".to_string(),
                additional_properties: HashMap::new(),
            }),
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
            healthcheck: Some(Healthcheck {
                test: HealthTest::List(vec![
                    "CMD".to_string(),
                    "wget".to_string(),
                    "--no-verbose".to_string(),
                    "--tries=1".to_string(),
                    "--spider".to_string(),
                    "http://localhost:3000/api/health".to_string(),
                ]),
                interval: "30s".to_string(),
                timeout: "10s".to_string(),
                retries: 3,
                start_period: "30s".to_string(),
                additional_properties: HashMap::new(),
            }),
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
            // Note: OTEL Collector health check is disabled as the container is too minimal
            // and doesn't have wget, curl, or nc available
            ..Default::default()
        },
    );

    Ok(docker_compose)
}

pub(crate) fn add_redis_to_docker_compose<'a>(
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
                healthcheck: Some(Healthcheck {
                    test: HealthTest::List(vec![
                        "CMD".to_string(),
                        "redis-cli".to_string(),
                        "ping".to_string(),
                    ]),
                    interval: "10s".to_string(),
                    timeout: "5s".to_string(),
                    retries: 5,
                    start_period: "10s".to_string(),
                    additional_properties: HashMap::new(),
                }),
                ..Default::default()
            },
        );
    }
    Ok(docker_compose)
}

pub(crate) fn remove_redis_from_docker_compose<'a>(
    docker_compose: &'a mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<&'a mut DockerCompose> {
    environment.shift_remove("REDIS_URL");
    if docker_compose.services.contains_key("redis") {
        docker_compose.services.shift_remove("redis");
    }
    Ok(docker_compose)
}

pub(crate) fn add_s3_to_docker_compose<'a>(
    app_name: &str,
    service_name: &str,
    docker_compose: &'a mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<&'a mut DockerCompose> {
    environment.insert("S3_URL".to_string(), "http://minio:9000".to_string());
    environment.insert(
        "S3_BUCKET".to_string(),
        format!("{}-{}-dev", app_name, service_name).to_string(),
    );
    environment.insert("S3_REGION".to_string(), "us-east-1".to_string());
    environment.insert("S3_SECRET_KEY_ID".to_string(), "minioadmin".to_string());
    environment.insert("S3_SECRET_ACCESS_KEY".to_string(), "minioadmin".to_string());
    if !docker_compose.services.contains_key("minio") {
        docker_compose.services.insert(
            "minio".to_string(),
            DockerService {
                image: Some("minio/minio".to_string()),
                container_name: Some(format!("{}-minio", app_name)),
                restart: Some(Restart::Always),
                ports: Some(vec!["9000:9000".to_string()]),
                networks: Some(vec![format!("{}-network", app_name)]),
                healthcheck: Some(Healthcheck {
                    test: HealthTest::List(vec![
                        "CMD".to_string(),
                        "wget".to_string(),
                        "--no-verbose".to_string(),
                        "--tries=1".to_string(),
                        "--spider".to_string(),
                        "http://localhost:9000/minio/health/live".to_string(),
                    ]),
                    interval: "30s".to_string(),
                    timeout: "10s".to_string(),
                    retries: 3,
                    start_period: "30s".to_string(),
                    additional_properties: HashMap::new(),
                }),
                ..Default::default()
            },
        );
    }
    Ok(docker_compose)
}

pub(crate) fn remove_s3_from_docker_compose<'a>(
    docker_compose: &'a mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<&'a mut DockerCompose> {
    environment.shift_remove("S3_URL");
    environment.shift_remove("S3_REGION");
    environment.shift_remove("S3_SECRET_KEY_ID");
    environment.shift_remove("S3_SECRET_ACCESS_KEY");
    environment.shift_remove("S3_BUCKET");
    if docker_compose.services.contains_key("minio") {
        docker_compose.services.shift_remove("minio");
    }
    Ok(docker_compose)
}

pub(crate) fn remove_service_from_docker_compose<'a>(
    docker_compose: &'a mut DockerCompose,
    service_name: &str,
) -> Result<&'a mut DockerCompose> {
    if docker_compose.services.contains_key(service_name) {
        docker_compose.services.shift_remove(service_name);
    }
    Ok(docker_compose)
}

pub(crate) fn remove_worker_from_docker_compose<'a>(
    docker_compose: &'a mut DockerCompose,
    worker_name: &str,
) -> Result<&'a mut DockerCompose> {
    if docker_compose
        .services
        .contains_key(format!("{}-{}", worker_name, "server").as_str())
    {
        docker_compose
            .services
            .shift_remove(format!("{}-{}", worker_name, "server").as_str());
    }
    if docker_compose
        .services
        .contains_key(format!("{}-{}", worker_name, "worker").as_str())
    {
        docker_compose
            .services
            .shift_remove(format!("{}-{}", worker_name, "worker").as_str());
    }
    Ok(docker_compose)
}

pub(crate) fn add_kafka_to_docker_compose<'a>(
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
                test: HealthTest::List(vec![
                    "CMD-SHELL".to_string(),
                    "echo srvr | nc localhost 2181 || exit 1".to_string(),
                ]),
                interval: "10s".to_string(),
                timeout: "5s".to_string(),
                retries: 5,
                start_period: "10s".to_string(),
                additional_properties: HashMap::new(),
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
                test: HealthTest::List(vec![
                    "CMD-SHELL".to_string(),
                    "kafka-topics --bootstrap-server kafka:29092 --list >/dev/null 2>&1 || exit 1"
                        .to_string(),
                ]),
                interval: "10s".to_string(),
                timeout: "10s".to_string(),
                retries: 5,
                start_period: "15s".to_string(),
                additional_properties: HashMap::new(),
            }),
            ..Default::default()
        },
    );

    Ok(docker_compose)
}

pub(crate) fn add_database_to_docker_compose(
    manifest_data: &ManifestData,
    docker_compose: &mut DockerCompose,
    environment: &mut IndexMap<String, String>,
) -> Result<()> {
    if let ManifestData::Worker(worker_data) = manifest_data {
        if !worker_data.is_database_enabled {
            return Ok(());
        }
    }

    let app_name = match manifest_data {
        ManifestData::Service(service_data) => &service_data.app_name,
        ManifestData::Worker(worker_data) => &worker_data.app_name,
        _ => unreachable!(),
    };

    let database = match manifest_data {
        ManifestData::Service(service_data) => &service_data.database,
        ManifestData::Worker(worker_data) => &worker_data.database.as_ref().unwrap(),
        _ => unreachable!(),
    };

    let name = match manifest_data {
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
                        healthcheck: Some(Healthcheck {
                            test: HealthTest::List(vec![
                                "CMD-SHELL".to_string(),
                                format!(
                                    "pg_isready -U postgresql -d {}-{}-dev -h 0.0.0.0",
                                    app_name, name
                                ),
                            ]),
                            interval: "10s".to_string(),
                            timeout: "5s".to_string(),
                            retries: 5,
                            start_period: "30s".to_string(),
                            additional_properties: HashMap::new(),
                        }),
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
                            test: HealthTest::List(vec![
                                "CMD-SHELL".to_string(),
                                "mongosh --eval 'db.runCommand(\"ping\").ok' localhost:27017/test --quiet".to_string(),
                            ]),
                            interval: "2s".to_string(),
                            timeout: "3s".to_string(),
                            retries: 5,
                            start_period: "3s".to_string(),
                            additional_properties: HashMap::new(),
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
                        healthcheck: Some(Healthcheck {
                            test: HealthTest::List(vec![
                                "CMD-SHELL".to_string(),
                                "mysqladmin ping -h 0.0.0.0 -u $${MYSQL_USER} -p$${MYSQL_PASSWORD}"
                                    .to_string(),
                            ]),
                            interval: "10s".to_string(),
                            timeout: "5s".to_string(),
                            retries: 5,
                            start_period: "30s".to_string(),
                            additional_properties: HashMap::new(),
                        }),
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
                        healthcheck: Some(Healthcheck {
                            test: HealthTest::List(vec![
                                "CMD-SHELL".to_string(),
                                "mysqladmin ping -h 0.0.0.0 -u $${MARIADB_USER} -p$${MARIADB_PASSWORD}".to_string(),
                            ]),
                            interval: "10s".to_string(),
                            timeout: "5s".to_string(),
                            retries: 5,
                            start_period: "30s".to_string(),
                            additional_properties: HashMap::new(),
                        }),
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
                        healthcheck: Some(Healthcheck {
                            test: HealthTest::List(vec![
                                "CMD-SHELL".to_string(),
                                "/opt/mssql-tools/bin/sqlcmd -S 0.0.0.0 -U sa -P \"$${SA_PASSWORD}\" -Q 'SELECT 1' || exit 1".to_string(),
                            ]),
                            interval: "10s".to_string(),
                            timeout: "5s".to_string(),
                            retries: 5,
                            start_period: "30s".to_string(),
                            additional_properties: HashMap::new(),
                        }),
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

pub(crate) fn clean_up_unused_infrastructure_services(
    docker_compose: &mut DockerCompose,
    projects: Vec<ProjectEntry>,
) -> Result<()> {
    let mut infrastructure_in_use = HashSet::new();

    for project in projects {
        if let Some(resources) = project.resources {
            if let Some(database) = resources.database {
                infrastructure_in_use.insert(database);
            }
            if let Some(cache) = resources.cache {
                infrastructure_in_use.insert(cache);
            }
            if let Some(queue) = resources.queue {
                let queue = queue.clone();
                infrastructure_in_use.insert(queue);
            }
        }
    }

    let mut all_infrastructure_set = HashSet::from(Database::VARIANTS);
    all_infrastructure_set.extend(Infrastructure::VARIANTS);
    all_infrastructure_set.extend(
        WorkerType::VARIANTS
            .iter()
            .filter(|r#type| r#type.parse::<WorkerType>().ok() != Some(WorkerType::Database)),
    );

    let all_infrastructure_set = all_infrastructure_set
        .iter()
        .map(|infrastructure| infrastructure.to_string())
        .collect::<HashSet<String>>();

    let unused_infrastructure = all_infrastructure_set
        .difference(&infrastructure_in_use)
        .flat_map(|component| match component.parse::<Infrastructure>() {
            Ok(Infrastructure::Redis) => vec!["redis".to_string()],
            _ => match component.parse::<Database>() {
                Ok(Database::MongoDB) => vec!["mongodb".to_string(), "mongo-init".to_string()],
                _ => vec![component.to_string()],
            },
        });

    for infrastructure in unused_infrastructure {
        docker_compose
            .services
            .shift_remove(&infrastructure.to_string());
    }

    Ok(())
}

fn add_base_definition_to_docker_compose(
    app_name: &str,
    name: &str,
    base_path: &Path,
    docker_compose_string: Option<String>,
) -> Result<(DockerCompose, i32, IndexMap<String, String>)> {
    let mut docker_compose: DockerCompose =
        if let Some(inner_docker_compose_string) = docker_compose_string {
            from_str(&inner_docker_compose_string)
                .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?
        } else {
            from_str(
                &read_to_string(base_path.join("docker-compose.yaml"))
                    .with_context(|| ERROR_FAILED_TO_READ_DOCKER_COMPOSE)?,
            )
            .with_context(|| ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE)?
        };

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
                        if num >= 8000 && num < 9000 && num > port_number && num != 8889 {
                            port_number = num;
                        }
                    }
                }
            }
        }
    }

    port_number += 1;

    let mut environment = IndexMap::new();
    environment.insert("NODE_ENV".to_string(), "development".to_string());
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

    Ok((docker_compose, port_number, environment))
}

fn create_base_service(
    app_name: &str,
    component_name: &str,
    runtime: &str,
    database: &Option<String>,
    is_cache_enabled: bool,
    is_s3_enabled: bool,
    is_in_memory_database: bool,
    port_number: Option<i32>,
    environment: IndexMap<String, String>,
    volumes: Vec<String>,
    container_name_suffix: Option<&str>,
    entrypoint_command: &str,
    additional_depends_on: Vec<String>,
) -> DockerService {
    let mut depends_on = vec![];

    if is_cache_enabled {
        depends_on.push("redis".to_string());
    }
    if is_s3_enabled {
        depends_on.push("minio".to_string());
    }
    if !is_in_memory_database && database.is_some() {
        depends_on.push(database.clone().unwrap());
    }

    depends_on.extend(additional_depends_on);

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
        depends_on: if depends_on.len() > 0 {
            Some(
                depends_on
                    .into_iter()
                    .map(|service_name| {
                        (
                            service_name,
                            DependsOn {
                                condition: DependencyCondition::ServiceStarted,
                            },
                        )
                    })
                    .collect(),
            )
        } else {
            None
        },
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
        healthcheck: if let Some(port_number) = port_number {
            // Add health check for services that expose HTTP ports
            Some(Healthcheck {
                test: HealthTest::List(vec![
                    "CMD".to_string(),
                    "wget".to_string(),
                    "--no-verbose".to_string(),
                    "--tries=1".to_string(),
                    "--spider".to_string(),
                    format!("http://0.0.0.0:{}/health", port_number),
                ]),
                interval: "30s".to_string(),
                timeout: "10s".to_string(),
                retries: 3,
                start_period: "40s".to_string(),
                additional_properties: HashMap::new(),
            })
        } else {
            None
        },
        ..Default::default()
    }
}

pub(crate) fn add_service_definition_to_docker_compose(
    manifest_data: &ServiceManifestData,
    base_path: &Path,
    docker_compose_string: Option<String>,
) -> Result<String> {
    let (mut docker_compose, port_number, mut environment) = add_base_definition_to_docker_compose(
        &manifest_data.app_name,
        &manifest_data.service_name,
        base_path,
        docker_compose_string,
    )?;

    if manifest_data.is_iam {
        environment.insert(
            "PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH".to_string(),
            "./public.pem".to_string(),
        );
    }
    if manifest_data.is_better_auth {
        environment.insert(
            "PASSWORD_ENCRYPTION_SECRET_PATH".to_string(),
            "./private.pem".to_string(),
        );
        environment.insert("BETTER_AUTH_BASE_PATH".to_string(), "/api/auth".to_string());
        environment.insert(
            "CORS_ORIGINS".to_string(),
            "http://localhost:3001".to_string(),
        );
    }
    if manifest_data.is_stripe {
        environment.insert(
            "STRIPE_API_KEY".to_string(),
            "replace-with-stripe-api-key".to_string(),
        );
    }

    if manifest_data.is_cache_enabled {
        add_redis_to_docker_compose(
            &manifest_data.app_name,
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    }

    if manifest_data.is_s3_enabled {
        add_s3_to_docker_compose(
            &manifest_data.app_name,
            &manifest_data.service_name,
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    }

    add_database_to_docker_compose(
        &ManifestData::Service(manifest_data),
        &mut docker_compose,
        &mut environment,
    )
    .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;

    let volumes = vec![
        format!(
            "./{}:/{}/{}",
            manifest_data.service_name, manifest_data.app_name, manifest_data.service_name
        ),
        format!(
            "/{}/{}/dist",
            manifest_data.app_name, manifest_data.service_name
        ),
        format!(
            "/{}/{}/node_modules",
            manifest_data.app_name, manifest_data.service_name
        ),
        format!("/{}/core/node_modules", manifest_data.app_name),
        format!("/{}/node_modules", manifest_data.app_name),
    ];

    let service_name = manifest_data.service_name.clone();
    if !docker_compose.services.contains_key(&service_name) {
        docker_compose.services.insert(
            service_name,
            create_base_service(
                &manifest_data.app_name,
                &manifest_data.service_name,
                &manifest_data.runtime,
                &Some(manifest_data.database.clone()),
                manifest_data.is_cache_enabled,
                manifest_data.is_s3_enabled,
                manifest_data.is_in_memory_database,
                Some(port_number),
                environment,
                volumes,
                None,
                "dev",
                vec![],
            ),
        );
    }

    Ok(to_string(&docker_compose)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?)
}

pub(crate) fn add_worker_definition_to_docker_compose(
    manifest_data: &WorkerManifestData,
    base_path: &Path,
    docker_compose_string: Option<String>,
) -> Result<String> {
    let (mut docker_compose, port_number, mut environment) = add_base_definition_to_docker_compose(
        &manifest_data.app_name,
        &manifest_data.worker_name,
        base_path,
        docker_compose_string,
    )?;

    environment.insert(
        "QUEUE_NAME".to_string(),
        format!(
            "{}-{}-dev",
            &manifest_data.app_name, &manifest_data.worker_name
        ),
    );

    if manifest_data.is_cache_enabled {
        add_redis_to_docker_compose(
            &manifest_data.app_name,
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    } else if manifest_data.is_database_enabled {
        add_database_to_docker_compose(
            &ManifestData::Worker(manifest_data),
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    } else if manifest_data.is_kafka_enabled {
        add_kafka_to_docker_compose(
            &manifest_data.app_name,
            &manifest_data.worker_name,
            &mut docker_compose,
            &mut environment,
        )
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?;
    }

    let volumes = vec![
        format!(
            "./{}:/{}/{}",
            manifest_data.worker_name, manifest_data.app_name, manifest_data.worker_name
        ),
        format!(
            "/{}/{}/dist",
            manifest_data.app_name, manifest_data.worker_name
        ),
        format!(
            "/{}/{}/node_modules",
            manifest_data.app_name, manifest_data.worker_name
        ),
        format!("/{}/core/node_modules", manifest_data.app_name),
        format!("/{}/node_modules", manifest_data.app_name),
    ];

    let server_service_name = format!("{}-server", manifest_data.worker_name);
    if !docker_compose.services.contains_key(&server_service_name) {
        docker_compose.services.insert(
            server_service_name.clone(),
            create_base_service(
                &manifest_data.app_name,
                &manifest_data.worker_name,
                &manifest_data.runtime,
                &manifest_data.database,
                manifest_data.is_cache_enabled,
                false,
                manifest_data.is_in_memory_database,
                Some(port_number),
                environment.clone(),
                volumes.clone(),
                Some("server"),
                "dev:server",
                vec![],
            ),
        );
    }

    let worker_service_name = format!("{}-worker", manifest_data.worker_name);
    if !docker_compose.services.contains_key(&worker_service_name) {
        docker_compose.services.insert(
            worker_service_name.clone(),
            create_base_service(
                &manifest_data.app_name,
                &manifest_data.worker_name,
                &manifest_data.runtime,
                &manifest_data.database,
                manifest_data.is_cache_enabled,
                false,
                manifest_data.is_in_memory_database,
                None,
                environment.clone(),
                volumes.clone(),
                Some("worker"),
                "dev:worker",
                vec![server_service_name.clone()],
            ),
        );
    }

    Ok(to_string(&docker_compose)
        .with_context(|| ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE)?)
}

const IN_MEMORY_DATABASE_DOCKERFILE_ADDENDUM: &str = "
# Install sqlite dependencies
RUN apk add --no-cache python3 py3-pip make build-base sqlite-dev
RUN pip install setuptools --break-system-packages
";

pub(crate) fn update_dockerfile_contents(
    dockerfile_contents: &str,
    runtime: &Runtime,
    is_in_memory_database: bool,
) -> Result<String> {
    let mut final_copy_line: i32 = -1;
    if runtime == &Runtime::Node
        && is_in_memory_database
        && !dockerfile_contents.contains(IN_MEMORY_DATABASE_DOCKERFILE_ADDENDUM)
    {
        for (index, line) in dockerfile_contents.lines().enumerate() {
            if line.contains("COPY") {
                final_copy_line = index.try_into().unwrap();
                break;
            }
        }
    }

    let mut new_dockerfile_contents = dockerfile_contents.lines().collect::<Vec<&str>>();
    if final_copy_line != -1 {
        new_dockerfile_contents.insert(
            final_copy_line.try_into().unwrap(),
            IN_MEMORY_DATABASE_DOCKERFILE_ADDENDUM,
        );
    }

    Ok(new_dockerfile_contents.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::Runtime;

    #[test]
    fn test_update_dockerfile_contents_inserts_addendum_after_last_copy() {
        let dockerfile =
            "FROM node:18-alpine\nCOPY . .\nRUN npm install\nCOPY extra .\nRUN npm run build";
        let runtime = Runtime::Node;
        let is_in_memory_database = true;
        let result =
            update_dockerfile_contents(dockerfile, &runtime, is_in_memory_database).unwrap();
        let lines: Vec<&str> = result.lines().collect();
        assert_eq!(
            lines[2],
            IN_MEMORY_DATABASE_DOCKERFILE_ADDENDUM
                .split('\n')
                .collect::<Vec<&str>>()[1]
                .trim()
        );
        assert_eq!(lines[0], "FROM node:18-alpine");
        assert_eq!(lines[6], "COPY . .");
        assert_eq!(lines[7], "RUN npm install");
        assert_eq!(lines[8], "COPY extra .");
        assert_eq!(lines[9], "RUN npm run build");
    }
}
