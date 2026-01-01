use std::{collections::HashMap, path::Path};

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    constants::RELEASE_MANIFEST_SCHEMA_VERSION,
    core::{
        manifest::{ProjectType, ResourceInventory, application::ApplicationManifestData},
        sync::detection::detect_routers_from_service,
    },
};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum EnvironmentVariableScope {
    Application,
    Service,
    Worker,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum EnvironmentVariableComponentType {
    Database,
    Cache,
    #[serde(rename = "object_store")]
    ObjectStore,
    Queue,
    Service,
    Worker,
    Key,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum EnvironmentVariableComponentProperty {
    Host,
    Hostname,
    Port,
    Url,
    Connection,
    #[serde(rename = "connection_string")]
    ConnectionString,
    Username,
    User,
    Password,
    Database,
    DbName,
    Fqdn,
    Bucket,
    Endpoint,
    Region,
    #[serde(rename = "private-pem")]
    PrivatePem,
    #[serde(rename = "public-pem")]
    PublicPem,
    #[serde(rename = "32-bytes-base64")]
    Base64Bytes32,
    #[serde(rename = "64-bytes-base64")]
    Base64Bytes64,
    #[serde(rename = "hex-key")]
    HexKey,
    #[serde(rename = "key-material")]
    KeyMaterial,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ConfigType {
    Service,
    Worker,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum WorkerType {
    Kafka,
    Redis,
    BullMQ,
    #[serde(rename = "postgresql")]
    PostgreSQL,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Runtime {
    Node,
    Bun,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct EnvironmentVariableComponent {
    pub r#type: EnvironmentVariableComponentType,
    pub property: EnvironmentVariableComponentProperty,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub passthrough: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct EnvironmentVariableRequirement {
    pub name: String,
    pub scope: EnvironmentVariableScope,
    #[serde(rename = "scopeId", skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component: Option<EnvironmentVariableComponent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct ReleaseManifest {
    #[serde(rename = "schemaVersion", skip_serializing_if = "Option::is_none")]
    pub schema_version: Option<String>,
    #[serde(rename = "applicationId")]
    pub application_id: String,
    #[serde(rename = "applicationName", skip_serializing_if = "Option::is_none")]
    pub application_name: Option<String>,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<Runtime>,
    #[serde(rename = "gitCommit")]
    pub git_commit: String,
    #[serde(rename = "gitBranch", skip_serializing_if = "Option::is_none")]
    pub git_branch: Option<String>,
    #[serde(rename = "gitRepository", skip_serializing_if = "Option::is_none")]
    pub git_repository: Option<String>,
    pub timestamp: String,
    pub services: Vec<ServiceDefinition>,
    pub infrastructure: InfrastructureConfig,
    #[serde(
        rename = "environmentVariables",
        skip_serializing_if = "Option::is_none"
    )]
    pub environment_variables: Option<EnvironmentVariables>,
    #[serde(
        rename = "requiredEnvironmentVariables",
        skip_serializing_if = "Option::is_none"
    )]
    pub required_environment_variables: Option<Vec<EnvironmentVariableRequirement>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct ServiceDefinition {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    pub config: ServiceConfigEnum,
    #[serde(rename = "buildContext", skip_serializing_if = "Option::is_none")]
    pub build_context: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dockerfile: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub(crate) enum ServiceConfigEnum {
    Service(ServiceConfig),
    Worker(WorkerConfig),
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct ServiceConfig {
    #[serde(rename = "type")]
    pub service_type: ConfigType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub controllers: Option<Vec<ControllerDefinition>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrations: Option<Vec<IntegrationDefinition>>,
    #[serde(rename = "openApiSpec", skip_serializing_if = "Option::is_none")]
    pub open_api_spec: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<Vec<String>>,
    #[serde(
        rename = "runtimeDependencies",
        skip_serializing_if = "Option::is_none"
    )]
    pub runtime_dependencies: Option<Vec<String>>,
    #[serde(rename = "instanceSize", skip_serializing_if = "Option::is_none")]
    pub instance_size: Option<String>,
    #[serde(rename = "healthCheck", skip_serializing_if = "Option::is_none")]
    pub health_check: Option<Value>,
    #[serde(rename = "isWorkerService", skip_serializing_if = "Option::is_none")]
    pub is_worker_service: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct WorkerConfig {
    #[serde(rename = "type")]
    pub config_type: ConfigType,
    #[serde(rename = "workerType")]
    pub worker_type: WorkerType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub concurrency: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<i32>,
    #[serde(rename = "maxRetries", skip_serializing_if = "Option::is_none")]
    pub max_retries: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,
    #[serde(rename = "deadLetterQueue", skip_serializing_if = "Option::is_none")]
    pub dead_letter_queue: Option<bool>,
    #[serde(flatten)]
    pub additional: Option<HashMap<String, Value>>,
    #[serde(
        rename = "runtimeDependencies",
        skip_serializing_if = "Option::is_none"
    )]
    pub runtime_dependencies: Option<Vec<String>>,
    #[serde(rename = "instanceSize", skip_serializing_if = "Option::is_none")]
    pub instance_size: Option<String>,
    #[serde(rename = "healthCheck", skip_serializing_if = "Option::is_none")]
    pub health_check: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct ControllerDefinition {
    pub id: String,
    pub name: String,
    pub path: String,
    pub routes: Vec<RouteDefinition>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct RouteDefinition {
    pub id: String,
    pub method: String,
    pub path: String,
    pub handler: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub middleware: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct IntegrationDefinition {
    pub id: String,
    #[serde(rename = "type")]
    pub integration_type: String,
    pub config: HashMap<String, Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct InfrastructureConfig {
    pub regions: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resources: Option<Vec<ResourceDefinition>>,
    #[serde(rename = "cloudProvider", skip_serializing_if = "Option::is_none")]
    pub cloud_provider: Option<String>,
    #[serde(rename = "vpcId", skip_serializing_if = "Option::is_none")]
    pub vpc_id: Option<String>,
    #[serde(
        rename = "defaultInstanceSize",
        skip_serializing_if = "Option::is_none"
    )]
    pub default_instance_size: Option<String>,
    #[serde(rename = "buildContext", skip_serializing_if = "Option::is_none")]
    pub build_context: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct ResourceDefinition {
    pub id: String,
    #[serde(rename = "type")]
    pub resource_type: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<HashMap<String, Value>>,
    #[serde(rename = "serviceName", skip_serializing_if = "Option::is_none")]
    pub service_name: Option<String>,
}

pub(crate) type EnvironmentVariables = HashMap<String, HashMap<String, Vec<EnvironmentVariable>>>;

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct EnvironmentVariable {
    pub key: String,
    pub value: String,
}

pub(crate) fn generate_release_manifest(
    application_id: String,
    version: String,
    git_commit: String,
    git_branch: Option<String>,
    manifest: &ApplicationManifestData,
    openapi_specs: &std::collections::HashMap<String, Value>,
    required_env_vars: Vec<EnvironmentVariableRequirement>,
    project_runtime_deps: &std::collections::HashMap<String, Vec<String>>,
    project_integrations: &std::collections::HashMap<
        String,
        Vec<crate::core::ast::infrastructure::integrations::Integration>,
    >,
    worker_configs: &std::collections::HashMap<
        String,
        crate::core::ast::infrastructure::worker_config::WorkerConfig,
    >,
) -> Result<ReleaseManifest> {
    let timestamp = chrono::Utc::now().to_rfc3339();

    let mut services = Vec::new();
    for project in &manifest.projects {
        if project.r#type == ProjectType::Service {
            let open_api_spec = openapi_specs.get(&project.name).cloned();
            let runtime_deps = project_runtime_deps.get(&project.name).cloned();
            let integrations = project_integrations.get(&project.name).map(|integrations| {
                integrations
                    .iter()
                    .map(|integration| IntegrationDefinition {
                        id: integration.id.clone(),
                        integration_type: integration.integration_type.clone(),
                        config: integration.config.clone(),
                        status: None,
                    })
                    .collect()
            });

            services.push(ServiceDefinition {
                id: project.name.clone(),
                name: project.name.clone(),
                status: None,
                config: ServiceConfigEnum::Service(ServiceConfig {
                    service_type: ConfigType::Service,
                    controllers: None,
                    integrations,
                    open_api_spec,
                    dependencies: None,
                    runtime_dependencies: runtime_deps,
                    instance_size: None,
                    health_check: None,
                    is_worker_service: None,
                }),
                build_context: if Path::new(&manifest.modules_path)
                    .join(&project.name)
                    .join("Dockerfile")
                    .exists()
                {
                    Some(format!("{}/{}", manifest.modules_path, project.name))
                } else {
                    Some(manifest.modules_path.clone())
                },
                dockerfile: manifest
                    .dockerfile
                    .clone()
                    .or_else(|| Some("Dockerfile".to_string())),
            });
        } else if project.r#type == ProjectType::Worker {
            let runtime_deps = project_runtime_deps.get(&project.name).cloned();
            let integrations = project_integrations.get(&project.name).map(|integrations| {
                integrations
                    .iter()
                    .map(|integration| IntegrationDefinition {
                        id: integration.id.clone(),
                        integration_type: integration.integration_type.clone(),
                        config: integration.config.clone(),
                        status: None,
                    })
                    .collect()
            });
            let open_api_spec = openapi_specs.get(&project.name).cloned();

            let worker_path = Path::new(&manifest.modules_path).join(&project.name);
            let controllers = if worker_path.join("api").join("routes").exists() {
                if let Ok(routers) = detect_routers_from_service(&worker_path) {
                    if !routers.is_empty() {
                        // Convert routers to controller definitions
                        // This is a simplified version - can be extended to extract full route details
                        Some(
                            routers
                                .into_iter()
                                .map(|router_name| ControllerDefinition {
                                    id: router_name.clone(),
                                    name: router_name.clone(),
                                    path: format!("/{}", router_name),
                                    routes: vec![], // Can be populated with full route analysis later
                                })
                                .collect(),
                        )
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            services.push(ServiceDefinition {
                id: format!("{}-service", project.name),
                name: format!("{}-service", project.name),
                status: None,
                config: ServiceConfigEnum::Service(ServiceConfig {
                    service_type: ConfigType::Service,
                    controllers,
                    integrations: integrations.as_ref().map(
                        |integrations: &Vec<IntegrationDefinition>| {
                            integrations
                                .iter()
                                .map(|integration| IntegrationDefinition {
                                    id: integration.id.clone(),
                                    integration_type: integration.integration_type.clone(),
                                    config: integration.config.clone(),
                                    status: integration.status.clone(),
                                })
                                .collect::<Vec<IntegrationDefinition>>()
                        },
                    ),
                    open_api_spec: open_api_spec.clone(),
                    dependencies: None,
                    runtime_dependencies: runtime_deps.clone(),
                    instance_size: None,
                    health_check: None,
                    is_worker_service: Some(true),
                }),
                build_context: if Path::new(&manifest.modules_path)
                    .join(&project.name)
                    .join("Dockerfile")
                    .exists()
                {
                    Some(format!("{}/{}", manifest.modules_path, project.name))
                } else {
                    Some(manifest.modules_path.clone())
                },
                dockerfile: manifest
                    .dockerfile
                    .clone()
                    .or_else(|| Some("Dockerfile".to_string())),
            });

            let worker_type_str = project
                .metadata
                .as_ref()
                .and_then(|m| m.r#type.clone())
                .unwrap_or_else(|| "bullmq".to_string());

            let worker_type = match worker_type_str.as_str() {
                "kafka" => WorkerType::Kafka,
                "redis" => WorkerType::Redis,
                "postgresql" => WorkerType::PostgreSQL,
                _ => WorkerType::BullMQ,
            };

            let extracted_config = worker_configs.get(&project.name);
            let worker_config = WorkerConfig {
                config_type: ConfigType::Worker,
                worker_type,
                concurrency: extracted_config.and_then(|c| c.concurrency),
                timeout: extracted_config.and_then(|c| c.timeout),
                max_retries: extracted_config.and_then(|c| c.max_retries),
                queue: extracted_config.and_then(|c| c.queue.clone()),
                priority: extracted_config.and_then(|c| c.priority.clone()),
                dead_letter_queue: extracted_config.and_then(|c| c.dead_letter_queue),
                additional: None,
                runtime_dependencies: runtime_deps,
                instance_size: None,
                health_check: None,
            };

            services.push(ServiceDefinition {
                id: format!("{}-worker", project.name),
                name: format!("{}-worker", project.name),
                status: None,
                config: ServiceConfigEnum::Worker(worker_config),
                build_context: Some(manifest.modules_path.clone()),
                dockerfile: manifest
                    .dockerfile
                    .clone()
                    .or_else(|| Some("Dockerfile".to_string())),
            });
        }
    }

    let mut resources = Vec::new();
    for project in &manifest.projects {
        if let Some(project_resources) = &project.resources {
            // For worker projects, resources need to be accessible to both
            // the "{name}-service" and "{name}-worker" components
            if project.r#type == ProjectType::Worker {
                // Create resources for the worker-service component
                let service_name = format!("{}-service", project.name);
                add_resources_from_inventory(&service_name, project_resources, &mut resources);

                // Create resources for the worker-worker component
                let worker_name = format!("{}-worker", project.name);
                add_resources_from_inventory(&worker_name, project_resources, &mut resources);
            } else {
                // For regular service projects, create resources with the project name
                add_resources_from_inventory(&project.name, project_resources, &mut resources);
            }
        }
    }

    let infrastructure = InfrastructureConfig {
        regions: vec![], // Default region
        resources: if resources.is_empty() {
            None
        } else {
            Some(resources)
        },
        cloud_provider: Some("aws".to_string()),
        vpc_id: None,
        default_instance_size: None,
        build_context: if Path::new(&manifest.modules_path)
            .join("Dockerfile")
            .exists()
        {
            Some(manifest.modules_path.clone())
        } else {
            None
        },
    };

    let runtime = match manifest.runtime.as_str() {
        "node" => Some(Runtime::Node),
        "bun" => Some(Runtime::Bun),
        _ => None,
    };

    Ok(ReleaseManifest {
        schema_version: Some(RELEASE_MANIFEST_SCHEMA_VERSION.to_string()),
        application_id,
        application_name: Some(manifest.app_name.clone()),
        version,
        runtime,
        git_commit,
        git_branch,
        git_repository: manifest.git_repository.clone(),
        timestamp,
        services,
        infrastructure,
        environment_variables: None,
        required_environment_variables: if required_env_vars.is_empty() {
            None
        } else {
            Some(required_env_vars)
        },
    })
}

fn add_resources_from_inventory(
    service_name: &str,
    inventory: &ResourceInventory,
    resources: &mut Vec<ResourceDefinition>,
) {
    if let Some(database) = &inventory.database {
        let mut config = HashMap::new();
        config.insert("technology".to_string(), Value::String(database.clone()));

        resources.push(ResourceDefinition {
            id: format!("{}-db", service_name),
            // Resource type must match platform IntegrationType enum literal
            // see forklaunch-platform/src/modules/platform-management/domain/enum/integration-type.enum.ts
            resource_type: "database".to_string(),
            name: format!("{}-database", service_name),
            region: None,
            config: Some(config),
            service_name: Some(service_name.to_string()),
        });
    }

    if let Some(cache) = &inventory.cache {
        let mut config = HashMap::new();
        config.insert("technology".to_string(), Value::String(cache.clone()));

        resources.push(ResourceDefinition {
            id: format!("{}-cache", service_name),
            // Cache resources map to the "cache" integration type
            resource_type: "cache".to_string(),
            name: format!("{}-cache", service_name),
            region: None,
            config: Some(config),
            service_name: Some(service_name.to_string()),
        });
    }

    if let Some(queue) = &inventory.queue {
        let mut config = HashMap::new();
        config.insert("technology".to_string(), Value::String(queue.clone()));

        resources.push(ResourceDefinition {
            id: format!("{}-queue", service_name),
            // Queues are modeled as message queues in the platform schema
            resource_type: "messagequeue".to_string(),
            name: format!("{}-queue", service_name),
            region: None,
            config: Some(config),
            service_name: Some(service_name.to_string()),
        });
    }

    if let Some(object_store) = &inventory.object_store {
        let mut config = HashMap::new();
        config.insert(
            "technology".to_string(),
            Value::String(object_store.clone()),
        );

        resources.push(ResourceDefinition {
            id: format!("{}-storage", service_name),
            // Object storage maps to the "objectstore" integration type
            resource_type: "objectstore".to_string(),
            name: format!("{}-storage", service_name),
            region: None,
            config: Some(config),
            service_name: Some(service_name.to_string()),
        });
    }
}
