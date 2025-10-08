use std::{
    collections::{HashMap, HashSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use regex::Regex;
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

#[derive(Debug, Clone)]
pub(crate) struct EnvFile {
    #[allow(dead_code)]
    pub(crate) path: PathBuf,
    pub(crate) variables: HashMap<String, String>,
}

pub(crate) fn load_env_file(path: &Path) -> Result<HashMap<String, String>> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read env file: {}", path.display()))?;

    let mut variables = HashMap::new();

    for line in content.lines() {
        let line = line.trim();

        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().to_string();
            let value = value.trim().to_string();

            let value = if (value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\''))
            {
                value[1..value.len() - 1].to_string()
            } else {
                value
            };

            variables.insert(key, value);
        }
    }

    Ok(variables)
}

pub(crate) fn find_env_files(project_path: &Path) -> Result<Vec<PathBuf>> {
    let mut env_files = Vec::new();

    if !project_path.exists() {
        return Ok(env_files);
    }

    let env_regex = Regex::new(r"^\.env(\.[a-zA-Z0-9_-]+)*$")?;

    if let Ok(entries) = fs::read_dir(project_path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(file_name) = entry.file_name().to_str() {
                    if env_regex.is_match(file_name) && entry.path().is_file() {
                        env_files.push(entry.path());
                    }
                }
            }
        }
    }

    env_files.sort_by(|a, b| {
        let a_name = a.file_name().unwrap().to_str().unwrap();
        let b_name = b.file_name().unwrap().to_str().unwrap();

        let get_priority = |name: &str| match name {
            ".env.local" => 0,
            ".env.development" => 1,
            ".env.production" => 2,
            ".env.test" => 3,
            ".env" => 4,
            _ => 5,
        };

        get_priority(a_name).cmp(&get_priority(b_name))
    });

    Ok(env_files)
}

pub(crate) fn load_project_env_files(project_path: &Path) -> Result<Vec<EnvFile>> {
    let env_file_paths = find_env_files(project_path)?;
    let mut env_files = Vec::new();

    for path in env_file_paths {
        let variables = load_env_file(&path)?;
        env_files.push(EnvFile { path, variables });
    }

    Ok(env_files)
}

#[allow(dead_code)]
pub(crate) fn get_all_env_vars_in_project(project_path: &Path) -> Result<HashSet<String>> {
    let env_files = load_project_env_files(project_path)?;
    let mut all_vars = HashSet::new();

    for env_file in env_files {
        for key in env_file.variables.keys() {
            all_vars.insert(key.clone());
        }
    }

    Ok(all_vars)
}

pub(crate) fn is_env_var_defined(project_path: &Path, var_name: &str) -> Result<bool> {
    let env_files = load_project_env_files(project_path)?;
    for env_file in env_files {
        if env_file.variables.contains_key(var_name) {
            return Ok(true);
        }
    }

    if let Ok(workspace_root) = find_workspace_root(project_path) {
        let cascading_env_paths = get_cascading_env_paths(project_path, &workspace_root)?;

        for env_path in cascading_env_paths {
            if let Ok(variables) = load_env_file(&env_path) {
                if variables.contains_key(var_name) {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}

pub(crate) fn get_target_env_file(project_path: &Path) -> Result<PathBuf> {
    let env_local = project_path.join(".env.local");
    let env_default = project_path.join(".env");

    if env_local.exists() {
        Ok(env_local)
    } else if env_default.exists() {
        Ok(env_default)
    } else {
        Ok(env_local)
    }
}

pub(crate) fn add_env_vars_to_file(file_path: &Path, vars: &HashMap<String, String>) -> Result<()> {
    let mut content = String::new();

    if file_path.exists() {
        content = fs::read_to_string(file_path)
            .with_context(|| format!("Failed to read env file: {}", file_path.display()))?;

        if !content.is_empty() && !content.ends_with('\n') {
            content.push('\n');
        }
    }

    let existing_vars = load_env_file(file_path)?;

    for (key, value) in vars {
        if !existing_vars.contains_key(key) {
            content.push_str(&format!("{}={}\n", key, value));
        }
    }

    let mut file = fs::File::create(file_path)
        .with_context(|| format!("Failed to create env file: {}", file_path.display()))?;

    file.write_all(content.as_bytes())
        .with_context(|| format!("Failed to write to env file: {}", file_path.display()))?;

    Ok(())
}

pub(crate) fn find_workspace_root(start_path: &Path) -> Result<PathBuf> {
    let mut current_path = start_path.canonicalize()?;

    loop {
        let manifest_path = current_path.join(".forklaunch").join("manifest.toml");
        if manifest_path.exists() {
            return Ok(current_path);
        }

        match current_path.parent() {
            Some(parent) => current_path = parent.to_path_buf(),
            None => {
                return Err(anyhow::anyhow!(
                    "Could not find workspace root (no .forklaunch/manifest.toml found)"
                ));
            }
        }
    }
}

pub(crate) fn get_modules_path(workspace_root: &Path) -> Result<PathBuf> {
    let manifest_path = workspace_root.join(".forklaunch").join("manifest.toml");

    if !manifest_path.exists() {
        return Err(anyhow::anyhow!(
            "Manifest file not found: {}",
            manifest_path.display()
        ));
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .with_context(|| format!("Failed to read manifest: {}", manifest_path.display()))?;

    let manifest: toml::Value =
        toml::from_str(&manifest_content).with_context(|| "Failed to parse manifest.toml")?;

    let modules_path = manifest
        .get("modules_path")
        .and_then(|v| v.as_str())
        .unwrap_or(".");

    Ok(workspace_root.join(modules_path))
}

pub(crate) fn get_cascading_env_paths(
    project_path: &Path,
    workspace_root: &Path,
) -> Result<Vec<PathBuf>> {
    let mut env_paths = Vec::new();

    let env_regex = Regex::new(r"^\.env(\.[a-zA-Z0-9_-]+)*$")?;

    let mut current_path = project_path.canonicalize()?;
    let normalized_workspace_root = workspace_root.canonicalize()?;

    while current_path.starts_with(&normalized_workspace_root) {
        if let Ok(entries) = fs::read_dir(&current_path) {
            let mut current_dir_env_files = Vec::new();

            for entry in entries {
                if let Ok(entry) = entry {
                    if let Some(file_name) = entry.file_name().to_str() {
                        if env_regex.is_match(file_name) && entry.path().is_file() {
                            current_dir_env_files.push(entry.path());
                        }
                    }
                }
            }

            current_dir_env_files.sort_by(|a, b| {
                let a_name = a.file_name().unwrap().to_str().unwrap();
                let b_name = b.file_name().unwrap().to_str().unwrap();

                let get_priority = |name: &str| match name {
                    ".env.local" => 0,
                    ".env" => 1,
                    ".env.development" => 2,
                    ".env.production" => 3,
                    ".env.test" => 4,
                    _ => 5,
                };

                get_priority(a_name).cmp(&get_priority(b_name))
            });

            env_paths.extend(current_dir_env_files);
        }

        if current_path == normalized_workspace_root {
            break;
        }

        match current_path.parent() {
            Some(parent) => current_path = parent.to_path_buf(),
            None => break,
        }
    }

    env_paths.reverse();

    Ok(env_paths)
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use super::*;

    #[test]
    fn test_load_env_file() {
        let temp_dir = TempDir::new().unwrap();
        let env_path = temp_dir.path().join(".env");

        fs::write(
            &env_path,
            "KEY1=value1\nKEY2=\"value2\"\n# Comment\nKEY3=value3",
        )
        .unwrap();

        let vars = load_env_file(&env_path).unwrap();
        assert_eq!(vars.get("KEY1"), Some(&"value1".to_string()));
        assert_eq!(vars.get("KEY2"), Some(&"value2".to_string()));
        assert_eq!(vars.get("KEY3"), Some(&"value3".to_string()));
        assert_eq!(vars.len(), 3);
    }

    #[test]
    fn test_add_env_vars_to_file() {
        let temp_dir = TempDir::new().unwrap();
        let env_path = temp_dir.path().join(".env");

        let mut vars = HashMap::new();
        vars.insert("NEW_VAR".to_string(), "new_value".to_string());
        vars.insert("ANOTHER_VAR".to_string(), "another_value".to_string());

        add_env_vars_to_file(&env_path, &vars).unwrap();

        let loaded_vars = load_env_file(&env_path).unwrap();
        assert_eq!(loaded_vars.get("NEW_VAR"), Some(&"new_value".to_string()));
        assert_eq!(
            loaded_vars.get("ANOTHER_VAR"),
            Some(&"another_value".to_string())
        );
    }
}
