use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::Result;
use regex::Regex;
use serde_json::from_str as json_from_str;

use crate::{
    constants::{Database, Infrastructure, InitializeType, WorkerType},
    core::package_json::project_package_json::ProjectPackageJson,
};
#[derive(Debug, Clone)]
pub struct DetectedConfig {
    pub database: Option<Database>,
    pub infrastructure: Vec<Infrastructure>,
    pub description: Option<String>,
    pub worker_type: Option<WorkerType>,
}

impl DetectedConfig {
    pub fn new() -> Self {
        Self {
            database: None,
            infrastructure: vec![],
            description: None,
            worker_type: None,
        }
    }
}

pub fn detect_database_from_mikro_orm_config(project_path: &Path) -> Result<Option<Database>> {
    let config_path = project_path.join("mikro-orm.config.ts");

    if !config_path.exists() {
        return Ok(None);
    }

    let content = read_to_string(&config_path)?;

    let driver_regex = Regex::new(r"driver:\s*(?:[a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z]+Driver)")
        .expect("Invalid regex pattern");

    if let Some(captures) = driver_regex.captures(&content) {
        if let Some(driver_name) = captures.get(1) {
            let driver = driver_name.as_str();

            return Ok(match driver {
                "MongoDriver" => Some(Database::MongoDB),
                "PostgreSqlDriver" => Some(Database::PostgreSQL),
                "MySqlDriver" => Some(Database::MySQL),
                "MariaDbDriver" => Some(Database::MariaDB),
                "MsSqlDriver" => Some(Database::MsSQL),
                "LibSqlDriver" => Some(Database::LibSQL),
                "SqliteDriver" => Some(Database::SQLite),
                "BetterSqliteDriver" => Some(Database::BetterSQLite),
                _ => None,
            });
        }
    }

    Ok(None)
}

pub fn has_database_in_registrations(project_path: &Path) -> Result<bool> {
    let registrations_path = project_path.join("registrations.ts");

    if !registrations_path.exists() {
        return Ok(false);
    }

    let content = read_to_string(&registrations_path)?;

    Ok(
        (content.contains("MikroORM") && content.contains("@mikro-orm/core"))
            || content.contains("EntityManager"),
    )
}

pub fn detect_infrastructure_from_registrations(
    project_path: &Path,
) -> Result<Vec<Infrastructure>> {
    let registrations_path = project_path.join("registrations.ts");
    let mut infrastructure = HashSet::new();

    if !registrations_path.exists() {
        return Ok(vec![]);
    }

    let content = read_to_string(&registrations_path)?;

    if content.contains("RedisTtlCache") || content.contains("TtlCache:") {
        infrastructure.insert(Infrastructure::Redis);
    }

    if content.contains("@aws-sdk/client-s3")
        || content.contains("S3Client")
        || content.contains("ObjectStore")
    {
        infrastructure.insert(Infrastructure::S3);
    }

    Ok(infrastructure.into_iter().collect())
}

pub fn detect_worker_type_from_registrations(project_path: &Path) -> Result<Option<WorkerType>> {
    let registrations_path = project_path.join("registrations.ts");

    if !registrations_path.exists() {
        return Ok(None);
    }

    let content = read_to_string(&registrations_path)?;

    if content.contains("DatabaseWorkerConsumer")
        || content.contains("implementation-worker-database")
    {
        return Ok(Some(WorkerType::Database));
    }
    if content.contains("RedisWorkerConsumer") || content.contains("implementation-worker-redis") {
        return Ok(Some(WorkerType::RedisCache));
    }
    if content.contains("KafkaWorkerConsumer") || content.contains("implementation-worker-kafka") {
        return Ok(Some(WorkerType::Kafka));
    }
    if content.contains("BullMQWorkerConsumer") || content.contains("implementation-worker-bullmq")
    {
        return Ok(Some(WorkerType::BullMQCache));
    }

    Ok(None)
}

pub fn detect_description_from_package_json(project_path: &Path) -> Result<Option<String>> {
    let package_json_path = project_path.join("package.json");

    if !package_json_path.exists() {
        return Ok(None);
    }

    let content = read_to_string(&package_json_path)?;
    let package_json: ProjectPackageJson = json_from_str(&content)?;

    Ok(package_json.description.clone())
}

pub fn detect_database_from_package_json(project_path: &Path) -> Result<Option<Database>> {
    let package_json_path = project_path.join("package.json");

    if !package_json_path.exists() {
        return Ok(None);
    }

    let content = read_to_string(&package_json_path)?;
    let package_json: ProjectPackageJson = json_from_str(&content)?;

    if let Some(deps) = &package_json.dependencies {
        let found_db = deps
            .databases
            .iter()
            .find(|db| Database::VARIANTS.contains(&db.to_string().as_str()));

        if let Some(db) = found_db {
            return Ok(Some(*db));
        }
    }

    Ok(None)
}

pub fn detect_service_config(service_path: &Path) -> Result<DetectedConfig> {
    let mut config = DetectedConfig::new();

    let has_db = has_database_in_registrations(service_path)?;

    if has_db {
        config.database = detect_database_from_mikro_orm_config(service_path)?;
        if config.database.is_none() {
            config.database = detect_database_from_package_json(service_path)?;
        }
    }

    config.infrastructure = detect_infrastructure_from_registrations(service_path)?;
    config.description = detect_description_from_package_json(service_path)?;

    Ok(config)
}

pub fn detect_worker_config(worker_path: &Path) -> Result<DetectedConfig> {
    let mut config = DetectedConfig::new();

    let has_db = has_database_in_registrations(worker_path)?;

    if has_db {
        config.database = detect_database_from_mikro_orm_config(worker_path)?;
        if config.database.is_none() {
            config.database = detect_database_from_package_json(worker_path)?;
        }
    }

    config.infrastructure = detect_infrastructure_from_registrations(worker_path)?;
    config.worker_type = detect_worker_type_from_registrations(worker_path)?;
    config.description = detect_description_from_package_json(worker_path)?;

    Ok(config)
}

pub fn detect_project_type(project_path: &Path) -> Result<Option<InitializeType>> {
    if !project_path.exists() {
        return Ok(None);
    }

    let worker_ts_path = project_path.join("worker.ts");
    if worker_ts_path.exists() {
        return Ok(Some(InitializeType::Worker));
    }

    let server_ts_path = project_path.join("server.ts");
    let routes_path = project_path.join("api").join("routes");
    if server_ts_path.exists() && routes_path.exists() {
        return Ok(Some(InitializeType::Service));
    }

    let index_ts_path = project_path.join("index.ts");
    let has_package_json = project_path.join("package.json").exists();
    if index_ts_path.exists() && has_package_json && !server_ts_path.exists() {
        return Ok(Some(InitializeType::Library));
    }

    Ok(None)
}

pub fn detect_routers_from_service(service_path: &Path) -> Result<Vec<String>> {
    let routes_path = service_path.join("api").join("routes");

    if !routes_path.exists() {
        return Ok(vec![]);
    }

    let mut routers = vec![];

    for entry in std::fs::read_dir(&routes_path)? {
        let entry = entry?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };

        // Skip index.ts
        if file_name == "index.ts" {
            continue;
        }

        // Match pattern: {routerName}.routes.ts
        if file_name.ends_with(".routes.ts") {
            let router_name = file_name.strip_suffix(".routes.ts").unwrap().to_string();
            routers.push(router_name);
        }
    }

    routers.sort();
    Ok(routers)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::*;

    #[test]
    fn test_detect_postgres_with_namespace() {
        let temp_dir = TempDir::new().unwrap();
        let service_path = temp_dir.path();

        fs::write(
            service_path.join("mikro-orm.config.ts"),
            "import { PostgreSqlDriver } from '@mikro-orm/postgresql';
            const config = defineConfig({
                driver: orm.PostgreSqlDriver,
                dbName: 'test',
            });",
        )
        .unwrap();

        let result = detect_database_from_mikro_orm_config(service_path).unwrap();
        assert_eq!(result, Some(Database::PostgreSQL));
    }

    #[test]
    fn test_detect_postgres_without_namespace() {
        let temp_dir = TempDir::new().unwrap();
        let service_path = temp_dir.path();

        fs::write(
            service_path.join("mikro-orm.config.ts"),
            "const config = defineConfig({
                driver: PostgreSqlDriver,
                dbName: 'test',
            });",
        )
        .unwrap();

        let result = detect_database_from_mikro_orm_config(service_path).unwrap();
        assert_eq!(result, Some(Database::PostgreSQL));
    }

    #[test]
    fn test_detect_redis_infrastructure() {
        let temp_dir = TempDir::new().unwrap();
        let service_path = temp_dir.path();

        fs::write(
            service_path.join("registrations.ts"),
            "import { RedisTtlCache } from '@forklaunch/infrastructure-redis';
            const deps = {
                TtlCache: {
                    type: RedisTtlCache,
                }
            }",
        )
        .unwrap();

        let result = detect_infrastructure_from_registrations(service_path).unwrap();
        assert!(result.contains(&Infrastructure::Redis));
    }

    #[test]
    fn test_has_database_in_registrations() {
        let temp_dir = TempDir::new().unwrap();
        let service_path = temp_dir.path();

        fs::write(
            service_path.join("registrations.ts"),
            "import { MikroORM } from '@mikro-orm/core';
            const deps = {
                MikroORM: {
                    factory: () => MikroORM.initSync(config)
                }
            }",
        )
        .unwrap();

        let result = has_database_in_registrations(service_path).unwrap();
        assert!(result);
    }

    #[test]
    fn test_comprehensive_detection() {
        let temp_dir = TempDir::new().unwrap();
        let service_path = temp_dir.path();

        // Create registrations.ts with database and redis
        fs::write(
            service_path.join("registrations.ts"),
            "import { MikroORM } from '@mikro-orm/core';
            import { RedisTtlCache } from '@forklaunch/infrastructure-redis';
            const deps = {
                MikroORM: {},
                TtlCache: {}
            }",
        )
        .unwrap();

        // Create mikro-orm.config with PostgreSQL
        fs::write(
            service_path.join("mikro-orm.config.ts"),
            "driver: PostgreSqlDriver,",
        )
        .unwrap();

        let config = detect_service_config(service_path).unwrap();
        assert_eq!(config.database, Some(Database::PostgreSQL));
    }
}
