use convert_case::{Case, Casing};
use ramhorns::Content;
use serde::{Deserialize, Serialize};

use super::{InitializableManifestConfig, InitializableManifestConfigMetadata};
use crate::{config_struct, constants::Database};

config_struct!(
    #[derive(Debug, Serialize, Content, Clone)]
    pub(crate) struct ApplicationManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) database: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_postgres: bool,
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
        pub(crate) is_mongo: bool,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) is_in_memory_database: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub(crate) platform_application_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub(crate) platform_organization_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub(crate) release_version: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub(crate) release_git_commit: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub(crate) release_git_branch: Option<String>,
    }
);

impl InitializableManifestConfig for ApplicationManifestData {
    fn initialize(&self, metadata: InitializableManifestConfigMetadata) -> Self {
        let metadata = match metadata {
            InitializableManifestConfigMetadata::Application(metadata) => metadata,
            _ => unreachable!(),
        };

        let initialized_application_manifest_data = Self {
            app_name: metadata.app_name.clone(),
            camel_case_app_name: metadata.app_name.clone().to_case(Case::Camel),
            pascal_case_app_name: metadata.app_name.clone().to_case(Case::Pascal),
            kebab_case_app_name: metadata.app_name.clone().to_case(Case::Kebab),
            ..self.clone()
        };

        if let Some(database) = metadata.database {
            let parsed_database = database.parse::<Database>().unwrap();
            return Self {
                database: parsed_database.to_string(),

                is_postgres: parsed_database == Database::PostgreSQL,
                is_sqlite: parsed_database == Database::SQLite,
                is_mysql: parsed_database == Database::MySQL,
                is_mariadb: parsed_database == Database::MariaDB,
                is_better_sqlite: parsed_database == Database::BetterSQLite,
                is_libsql: parsed_database == Database::LibSQL,
                is_mssql: parsed_database == Database::MsSQL,
                is_mongo: parsed_database == Database::MongoDB,
                is_in_memory_database: parsed_database == Database::SQLite
                    || parsed_database == Database::BetterSQLite
                    || parsed_database == Database::LibSQL,

                ..initialized_application_manifest_data
            };
        }

        initialized_application_manifest_data
    }
}
