use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct Env {
    #[serde(rename = "DB_NAME", skip_serializing_if = "Option::is_none")]
    pub db_name: Option<String>,
    #[serde(rename = "DB_HOST", skip_serializing_if = "Option::is_none")]
    pub db_host: Option<String>,
    #[serde(rename = "DB_USER", skip_serializing_if = "Option::is_none")]
    pub db_user: Option<String>,
    #[serde(rename = "DB_PASSWORD", skip_serializing_if = "Option::is_none")]
    pub db_password: Option<String>,
    #[serde(rename = "DB_PORT", skip_serializing_if = "Option::is_none")]
    pub db_port: Option<String>,
    #[serde(rename = "REDIS_URL", skip_serializing_if = "Option::is_none")]
    pub redis_url: Option<String>,
    #[serde(rename = "KAFKA_BROKERS", skip_serializing_if = "Option::is_none")]
    pub kafka_brokers: Option<String>,
    #[serde(rename = "KAFKA_CLIENT_ID", skip_serializing_if = "Option::is_none")]
    pub kafka_client_id: Option<String>,
    #[serde(rename = "KAFKA_GROUP_ID", skip_serializing_if = "Option::is_none")]
    pub kafka_group_id: Option<String>,
    #[serde(rename = "ENV", skip_serializing_if = "Option::is_none")]
    pub env: Option<String>,
    #[serde(
        rename = "OTEL_EXPORTER_OTLP_ENDPOINT",
        skip_serializing_if = "Option::is_none"
    )]
    pub otel_exporter_otlp_endpoint: Option<String>,
    #[serde(rename = "OTEL_SERVICE_NAME", skip_serializing_if = "Option::is_none")]
    pub otel_service_name: Option<String>,
    #[serde(rename = "QUEUE_NAME", skip_serializing_if = "Option::is_none")]
    pub queue_name: Option<String>,
    #[serde(rename = "HOST", skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(rename = "PROTOCOL", skip_serializing_if = "Option::is_none")]
    pub protocol: Option<String>,
    #[serde(rename = "PORT", skip_serializing_if = "Option::is_none")]
    pub port: Option<String>,
    #[serde(rename = "VERSION", skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(rename = "DOCS_PATH", skip_serializing_if = "Option::is_none")]
    pub docs_path: Option<String>,
    #[serde(
        rename = "PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH",
        skip_serializing_if = "Option::is_none"
    )]
    pub password_encryption_public_key_path: Option<String>,
}
