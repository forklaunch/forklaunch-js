use convert_case::{Case, Casing};
use ramhorns::Content;
use serde::{Deserialize, Serialize};

use super::{
    InitializableManifestConfig, InitializableManifestConfigMetadata, ProjectManifestConfig,
};
use crate::{
    config_struct,
    constants::{Database, Infrastructure},
    core::{
        database::{get_database_port, get_db_driver},
        worker_type::{
            get_default_worker_options, get_worker_consumer_factory, get_worker_producer_factory,
        },
    },
};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct WorkerManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) worker_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) pascal_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) title_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) kebab_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database: Option<String>,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) db_driver: Option<String>,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database_port: Option<String>,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_worker: bool,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mongo: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mysql: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mariadb: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mssql: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_sqlite: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_better_sqlite: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_libsql: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_in_memory_database: bool,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_cache_enabled: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_database_enabled: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_kafka_enabled: bool,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) worker_type: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) worker_type_lowercase: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) default_worker_options: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) worker_consumer_factory: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) worker_producer_factory: String,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_iam_configured: bool,
    }
);

impl ProjectManifestConfig for WorkerManifestData {
    fn name(&self) -> &String {
        &self.worker_name
    }
    fn description(&self) -> &String {
        &self.description
    }
}

impl InitializableManifestConfig for WorkerManifestData {
    fn initialize(&self, metadata: InitializableManifestConfigMetadata) -> Self {
        let worker_metadata = match metadata {
            InitializableManifestConfigMetadata::Project(worker_metadata) => worker_metadata,
            _ => unreachable!(),
        };
        let worker_name = worker_metadata.project_name.clone();
        let project_entry = self
            .projects
            .iter()
            .find(|p| p.name == worker_metadata.project_name.clone())
            .unwrap();
        let database = worker_metadata.database.clone().or_else(|| {
            project_entry
                .resources
                .as_ref()
                .and_then(|r| r.database.as_ref())
                .map(|d| d.parse::<Database>().unwrap())
        });
        let worker_type = worker_metadata.worker_type.clone().unwrap_or(
            project_entry
                .metadata
                .as_ref()
                .unwrap()
                .r#type
                .clone()
                .unwrap()
                .parse()
                .unwrap(),
        );
        Self {
            worker_name: worker_name.clone(),
            camel_case_name: worker_name.clone().to_case(Case::Camel),
            pascal_case_name: worker_name.clone().to_case(Case::Pascal),
            kebab_case_name: worker_name.clone().to_case(Case::Kebab),
            database: database.map(|d| d.to_string()),
            description: project_entry.description.clone(),
            db_driver: database.map(|d| get_db_driver(&d)),
            database_port: database.map(|d| get_database_port(&d).unwrap()),
            is_worker: true,

            is_postgres: database == Some(Database::PostgreSQL),
            is_mongo: database == Some(Database::MongoDB),
            is_sqlite: database == Some(Database::SQLite),
            is_mysql: database == Some(Database::MySQL),
            is_mariadb: database == Some(Database::MariaDB),
            is_better_sqlite: database == Some(Database::BetterSQLite),
            is_libsql: database == Some(Database::LibSQL),
            is_mssql: database == Some(Database::MsSQL),
            is_in_memory_database: database == Some(Database::LibSQL)
                || database == Some(Database::SQLite)
                || database == Some(Database::BetterSQLite),

            is_cache_enabled: worker_metadata
                .infrastructure
                .as_ref()
                .map_or(false, |i| i.contains(&Infrastructure::Redis))
                || project_entry
                    .resources
                    .as_ref()
                    .map_or(false, |r| r.cache.is_some()),
            is_database_enabled: worker_metadata.database.is_some()
                || project_entry
                    .resources
                    .as_ref()
                    .map_or(false, |r| r.database.is_some()),
            is_kafka_enabled: project_entry
                .resources
                .as_ref()
                .and_then(|r| r.queue.as_ref())
                .is_some_and(|queue| queue == "kafka"),

            worker_type: worker_type.to_string(),
            worker_type_lowercase: worker_type.to_string().to_lowercase(),
            default_worker_options: get_default_worker_options(&worker_type),
            worker_consumer_factory: get_worker_consumer_factory(&worker_type, &worker_name),
            worker_producer_factory: get_worker_producer_factory(&worker_type),

            is_iam_configured: self.projects.iter().any(|project_entry| {
                if project_entry.name == "iam" {
                    return true;
                }
                return false;
            }),
            ..self.clone()
        }
    }
}
