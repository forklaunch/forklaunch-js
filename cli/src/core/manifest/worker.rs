use ramhorns::Content;
use serde::{Deserialize, Serialize};

use super::ProjectManifestConfig;
use crate::config_struct;

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
    }
);

impl ProjectManifestConfig for WorkerManifestData {
    fn name(&self) -> &String {
        &self.worker_name
    }
}
