use convert_case::{Case, Casing};
use ramhorns::Content;
use serde::{Deserialize, Serialize};

use super::{
    InitializableManifestConfig, InitializableManifestConfigMetadata, ProjectManifestConfig,
};
use crate::{
    config_struct,
    constants::{Database, Module, get_service_module_name},
    core::database::{get_database_port, get_db_driver},
};

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct ServiceManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) service_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) service_path: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) pascal_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) kebab_case_name: String,
        #[serde(skip_deserializing, skip_serializing)]
        pub(crate) database: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) db_driver: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database_port: Option<String>,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_postgres: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mongo: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_sqlite: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mysql: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mariadb: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_better_sqlite: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_libsql: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_mssql: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_in_memory_database: bool,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_iam: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_billing: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_cache_enabled: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_s3_enabled: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_database_enabled: bool,

        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_better_auth: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_stripe: bool,
    }
);

impl ProjectManifestConfig for ServiceManifestData {
    fn name(&self) -> &String {
        &self.service_name
    }
    fn description(&self) -> &String {
        &self.description
    }
}

impl InitializableManifestConfig for ServiceManifestData {
    fn initialize(&self, metadata: InitializableManifestConfigMetadata) -> Self {
        let service_metadata = match metadata {
            InitializableManifestConfigMetadata::Project(service_metadata) => service_metadata,
            _ => unreachable!(),
        };
        let service_name = service_metadata.project_name.clone();
        let project_entry = self
            .projects
            .iter()
            .find(|p| p.name == service_metadata.project_name.clone())
            .unwrap();
        let database = project_entry
            .resources
            .as_ref()
            .unwrap()
            .database
            .clone()
            .unwrap();
        let parsed_database = database.parse::<Database>().unwrap();
        Self {
            service_name: service_name.clone(),
            camel_case_name: service_name.clone().to_case(Case::Camel),
            pascal_case_name: service_name.clone().to_case(Case::Pascal),
            kebab_case_name: service_name.clone().to_case(Case::Kebab),
            database,
            description: "".to_string(),
            db_driver: get_db_driver(&parsed_database),
            database_port: get_database_port(&parsed_database),

            is_postgres: parsed_database == Database::PostgreSQL,
            is_mongo: parsed_database == Database::MongoDB,
            is_sqlite: parsed_database == Database::SQLite,
            is_mysql: parsed_database == Database::MySQL,
            is_mariadb: parsed_database == Database::MariaDB,
            is_better_sqlite: parsed_database == Database::BetterSQLite,
            is_libsql: parsed_database == Database::LibSQL,
            is_mssql: parsed_database == Database::MsSQL,
            is_in_memory_database: parsed_database == Database::LibSQL
                || parsed_database == Database::SQLite
                || parsed_database == Database::BetterSQLite,

            is_iam: service_name == get_service_module_name(&Module::BaseIam)
                || service_name == get_service_module_name(&Module::BetterAuthIam),
            is_billing: service_name == get_service_module_name(&Module::BaseBilling)
                || service_name == get_service_module_name(&Module::StripeBilling),
            is_cache_enabled: project_entry.resources.as_ref().unwrap().cache.is_some(),
            is_s3_enabled: project_entry
                .resources
                .as_ref()
                .unwrap()
                .object_store
                .is_some(),
            is_database_enabled: project_entry.resources.as_ref().unwrap().database.is_some(),

            is_better_auth: project_entry.variant.is_some()
                && project_entry
                    .variant
                    .as_ref()
                    .unwrap()
                    .parse::<Module>()
                    .unwrap()
                    == Module::BetterAuthIam,
            ..self.clone()
        }
    }
}
