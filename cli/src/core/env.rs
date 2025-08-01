use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub(crate) struct Env {
    #[serde(rename = "DB_NAME", skip_serializing_if = "Option::is_none")]
    pub(crate) db_name: Option<String>,
    #[serde(rename = "DB_HOST", skip_serializing_if = "Option::is_none")]
    pub(crate) db_host: Option<String>,
    #[serde(rename = "DB_USER", skip_serializing_if = "Option::is_none")]
    pub(crate) db_user: Option<String>,
    #[serde(rename = "DB_PASSWORD", skip_serializing_if = "Option::is_none")]
    pub(crate) db_password: Option<String>,
    #[serde(rename = "DB_PORT", skip_serializing_if = "Option::is_none")]
    pub(crate) db_port: Option<String>,
    #[serde(rename = "REDIS_URL", skip_serializing_if = "Option::is_none")]
    pub(crate) redis_url: Option<String>,
    #[serde(rename = "S3_URL", skip_serializing_if = "Option::is_none")]
    pub(crate) s3_url: Option<String>,
    #[serde(rename = "S3_BUCKET", skip_serializing_if = "Option::is_none")]
    pub(crate) s3_bucket: Option<String>,
    #[serde(rename = "S3_REGION", skip_serializing_if = "Option::is_none")]
    pub(crate) s3_region: Option<String>,
    #[serde(rename = "S3_SECRET_KEY_ID", skip_serializing_if = "Option::is_none")]
    pub(crate) s3_access_key: Option<String>,
    #[serde(
        rename = "S3_SECRET_ACCESS_KEY",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) s3_secret_key: Option<String>,
    #[serde(rename = "KAFKA_BROKERS", skip_serializing_if = "Option::is_none")]
    pub(crate) kafka_brokers: Option<String>,
    #[serde(rename = "KAFKA_CLIENT_ID", skip_serializing_if = "Option::is_none")]
    pub(crate) kafka_client_id: Option<String>,
    #[serde(rename = "KAFKA_GROUP_ID", skip_serializing_if = "Option::is_none")]
    pub(crate) kafka_group_id: Option<String>,
    #[serde(rename = "NODE_ENV", skip_serializing_if = "Option::is_none")]
    pub(crate) env: Option<String>,
    #[serde(
        rename = "OTEL_EXPORTER_OTLP_ENDPOINT",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) otel_exporter_otlp_endpoint: Option<String>,
    #[serde(rename = "OTEL_SERVICE_NAME", skip_serializing_if = "Option::is_none")]
    pub(crate) otel_service_name: Option<String>,
    #[serde(rename = "QUEUE_NAME", skip_serializing_if = "Option::is_none")]
    pub(crate) queue_name: Option<String>,
    #[serde(rename = "HOST", skip_serializing_if = "Option::is_none")]
    pub(crate) host: Option<String>,
    #[serde(rename = "PROTOCOL", skip_serializing_if = "Option::is_none")]
    pub(crate) protocol: Option<String>,
    #[serde(rename = "PORT", skip_serializing_if = "Option::is_none")]
    pub(crate) port: Option<String>,
    #[serde(rename = "VERSION", skip_serializing_if = "Option::is_none")]
    pub(crate) version: Option<String>,
    #[serde(rename = "DOCS_PATH", skip_serializing_if = "Option::is_none")]
    pub(crate) docs_path: Option<String>,
    #[serde(
        rename = "PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) password_encryption_public_key_path: Option<String>,
    #[serde(
        rename = "PASSWORD_ENCRYPTION_SECRET_PATH",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) password_encryption_secret_path: Option<String>,
    #[serde(
        rename = "BETTER_AUTH_BASE_PATH",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) better_auth_base_path: Option<String>,
    #[serde(rename = "CORS_ORIGINS", skip_serializing_if = "Option::is_none")]
    pub(crate) cors_origins: Option<String>,
    #[serde(rename = "STRIPE_API_KEY", skip_serializing_if = "Option::is_none")]
    pub(crate) stripe_api_key: Option<String>,
    #[serde(flatten, default)]
    pub(crate) additional_env_vars: HashMap<String, String>,
}

impl<'de> Deserialize<'de> for Env {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(field_identifier, rename_all = "SCREAMING_SNAKE_CASE")]
        enum Field {
            DbName,
            DbHost,
            DbUser,
            DbPassword,
            DbPort,
            RedisUrl,
            KafkaBrokers,
            KafkaClientId,
            KafkaGroupId,
            Env,
            OtelExporterOtlpEndpoint,
            OtelServiceName,
            QueueName,
            Host,
            Protocol,
            Port,
            Version,
            DocsPath,
            PasswordEncryptionPublicKeyPath,
            Other(String),
        }

        struct EnvVisitor;

        impl<'de> serde::de::Visitor<'de> for EnvVisitor {
            type Value = Env;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("struct Env")
            }

            fn visit_map<V>(self, mut map: V) -> Result<Env, V::Error>
            where
                V: serde::de::MapAccess<'de>,
            {
                let mut env = Env {
                    db_name: None,
                    db_host: None,
                    db_user: None,
                    db_password: None,
                    db_port: None,
                    redis_url: None,
                    s3_url: None,
                    s3_bucket: None,
                    s3_region: None,
                    s3_access_key: None,
                    s3_secret_key: None,
                    kafka_brokers: None,
                    kafka_client_id: None,
                    kafka_group_id: None,
                    env: None,
                    otel_exporter_otlp_endpoint: None,
                    otel_service_name: None,
                    queue_name: None,
                    host: None,
                    protocol: None,
                    port: None,
                    version: None,
                    docs_path: None,
                    password_encryption_public_key_path: None,
                    password_encryption_secret_path: None,
                    better_auth_base_path: None,
                    cors_origins: None,
                    stripe_api_key: None,
                    additional_env_vars: HashMap::new(),
                };

                while let Some(key) = map.next_key::<Field>()? {
                    match key {
                        Field::DbName => env.db_name = Some(map.next_value()?),
                        Field::DbHost => env.db_host = Some(map.next_value()?),
                        Field::DbUser => env.db_user = Some(map.next_value()?),
                        Field::DbPassword => env.db_password = Some(map.next_value()?),
                        Field::DbPort => env.db_port = Some(map.next_value()?),
                        Field::RedisUrl => env.redis_url = Some(map.next_value()?),
                        Field::KafkaBrokers => env.kafka_brokers = Some(map.next_value()?),
                        Field::KafkaClientId => env.kafka_client_id = Some(map.next_value()?),
                        Field::KafkaGroupId => env.kafka_group_id = Some(map.next_value()?),
                        Field::Env => env.env = Some(map.next_value()?),
                        Field::OtelExporterOtlpEndpoint => {
                            env.otel_exporter_otlp_endpoint = Some(map.next_value()?)
                        }
                        Field::OtelServiceName => env.otel_service_name = Some(map.next_value()?),
                        Field::QueueName => env.queue_name = Some(map.next_value()?),
                        Field::Host => env.host = Some(map.next_value()?),
                        Field::Protocol => env.protocol = Some(map.next_value()?),
                        Field::Port => env.port = Some(map.next_value()?),
                        Field::Version => env.version = Some(map.next_value()?),
                        Field::DocsPath => env.docs_path = Some(map.next_value()?),
                        Field::PasswordEncryptionPublicKeyPath => {
                            env.password_encryption_public_key_path = Some(map.next_value()?)
                        }
                        Field::Other(key) => {
                            env.additional_env_vars.insert(key, map.next_value()?);
                        }
                    }
                }

                Ok(env)
            }
        }

        deserializer.deserialize_map(EnvVisitor)
    }
}
