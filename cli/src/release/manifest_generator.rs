use std::collections::HashMap;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    constants::RELEASE_MANIFEST_SCHEMA_VERSION,
    core::manifest::{ProjectType, ResourceInventory, application::ApplicationManifestData},
};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum EnvironmentVariableScope {
    Application,
    Service,
    Worker,
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
pub(crate) struct EnvironmentVariableRequirement {
    pub name: String,
    pub scope: EnvironmentVariableScope,
    #[serde(rename = "scopeId", skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
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
) -> Result<ReleaseManifest> {
    let timestamp = chrono::Utc::now().to_rfc3339();

    let mut services = Vec::new();
    for project in &manifest.projects {
        if project.r#type == ProjectType::Service {
            let open_api_spec = openapi_specs.get(&project.name).cloned();
            let runtime_deps = project_runtime_deps.get(&project.name).cloned();

            services.push(ServiceDefinition {
                id: project.name.clone(),
                name: project.name.clone(),
                status: None,
                config: ServiceConfigEnum::Service(ServiceConfig {
                    service_type: ConfigType::Service,
                    controllers: None,
                    integrations: None,
                    open_api_spec,
                    dependencies: None,
                    runtime_dependencies: runtime_deps,
                    instance_size: None,
                    health_check: None,
                }),
                build_context: Some(format!("{}/{}", manifest.modules_path, project.name)),
                dockerfile: manifest
                    .dockerfile
                    .clone()
                    .or_else(|| Some("Dockerfile".to_string())),
            });
        } else if project.r#type == ProjectType::Worker {
            let runtime_deps = project_runtime_deps.get(&project.name).cloned();

            // Determine worker type from project metadata
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

            services.push(ServiceDefinition {
                id: project.name.clone(),
                name: project.name.clone(),
                status: None,
                config: ServiceConfigEnum::Worker(WorkerConfig {
                    config_type: ConfigType::Worker,
                    worker_type,
                    concurrency: None,
                    timeout: None,
                    max_retries: None,
                    queue: None,
                    priority: None,
                    dead_letter_queue: None,
                    additional: None,
                    runtime_dependencies: runtime_deps,
                    instance_size: None,
                    health_check: None,
                }),
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
            add_resources_from_inventory(&project.name, project_resources, &mut resources);
        }
    }

    let infrastructure = InfrastructureConfig {
        regions: vec!["us-east-1".to_string()], // Default region
        resources: if resources.is_empty() {
            None
        } else {
            Some(resources)
        },
        cloud_provider: Some("aws".to_string()),
        vpc_id: None,
        default_instance_size: None,
        build_context: None,
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
        resources.push(ResourceDefinition {
            id: format!("{}-db", service_name),
            resource_type: database.clone(),
            name: format!("{}-database", service_name),
            region: None,
            config: None,
        });
    }

    if let Some(cache) = &inventory.cache {
        resources.push(ResourceDefinition {
            id: format!("{}-cache", service_name),
            resource_type: cache.clone(),
            name: format!("{}-cache", service_name),
            region: None,
            config: None,
        });
    }

    if let Some(queue) = &inventory.queue {
        resources.push(ResourceDefinition {
            id: format!("{}-queue", service_name),
            resource_type: queue.clone(),
            name: format!("{}-queue", service_name),
            region: None,
            config: None,
        });
    }

    if let Some(object_store) = &inventory.object_store {
        resources.push(ResourceDefinition {
            id: format!("{}-storage", service_name),
            resource_type: object_store.clone(),
            name: format!("{}-storage", service_name),
            region: None,
            config: None,
        });
    }
}
