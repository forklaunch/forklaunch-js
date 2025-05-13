use std::{
    collections::{HashMap, HashSet},
    fmt,
};

use serde::{Deserialize, Serialize, Serializer, de::Visitor};
use serde_json::Value;

use crate::constants::Database;

#[derive(Debug)]
struct ProjectDependenciesWithProjectName {
    project_dependencies_value: Value,
    app_name: String,
}

impl Serialize for ProjectDependenciesWithProjectName {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut deps = self.project_dependencies_value.clone();
        deps["app_name"] = serde_json::to_value(self.app_name.clone()).unwrap();
        deps.serialize(serializer)
    }
}

#[derive(Debug, Serialize, Default)]
pub struct ProjectScripts {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clean: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dev: Option<String>,
    #[serde(rename = "dev:server", skip_serializing_if = "Option::is_none")]
    pub dev_server: Option<String>,
    #[serde(rename = "dev:worker", skip_serializing_if = "Option::is_none")]
    pub dev_worker: Option<String>,
    #[serde(rename = "dev:local", skip_serializing_if = "Option::is_none")]
    pub dev_local: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lint: Option<String>,
    #[serde(rename = "lint:fix", skip_serializing_if = "Option::is_none")]
    pub lint_fix: Option<String>,
    #[serde(rename = "migrate:create", skip_serializing_if = "Option::is_none")]
    pub migrate_create: Option<String>,
    #[serde(rename = "migrate:down", skip_serializing_if = "Option::is_none")]
    pub migrate_down: Option<String>,
    #[serde(rename = "migrate:init", skip_serializing_if = "Option::is_none")]
    pub migrate_init: Option<String>,
    #[serde(rename = "migrate:up", skip_serializing_if = "Option::is_none")]
    pub migrate_up: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<String>,
    #[serde(rename = "start:server", skip_serializing_if = "Option::is_none")]
    pub start_server: Option<String>,
    #[serde(rename = "start:worker", skip_serializing_if = "Option::is_none")]
    pub start_worker: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test: Option<String>,

    #[serde(flatten)]
    pub additional_scripts: HashMap<String, String>,
}

impl<'de> Deserialize<'de> for ProjectScripts {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct ProjectScriptsVisitor;

        impl<'de> Visitor<'de> for ProjectScriptsVisitor {
            type Value = ProjectScripts;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a map of script names to commands")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: serde::de::MapAccess<'de>,
            {
                let mut scripts = ProjectScripts {
                    build: None,
                    clean: None,
                    dev: None,
                    dev_server: None,
                    dev_worker: None,
                    dev_local: None,
                    docs: None,
                    format: None,
                    lint: None,
                    lint_fix: None,
                    migrate_create: None,
                    migrate_down: None,
                    migrate_init: None,
                    migrate_up: None,
                    seed: None,
                    start: None,
                    start_server: None,
                    start_worker: None,
                    test: None,
                    additional_scripts: HashMap::new(),
                };

                while let Some((key, value)) = access.next_entry::<String, String>()? {
                    match key.as_str() {
                        "build" => scripts.build = Some(value),
                        "clean" => scripts.clean = Some(value),
                        "dev" => scripts.dev = Some(value),
                        "dev:server" => scripts.dev_server = Some(value),
                        "dev:worker" => scripts.dev_worker = Some(value),
                        "dev:local" => scripts.dev_local = Some(value),
                        "docs" => scripts.docs = Some(value),
                        "format" => scripts.format = Some(value),
                        "lint" => scripts.lint = Some(value),
                        "lint:fix" => scripts.lint_fix = Some(value),
                        "migrate:create" => scripts.migrate_create = Some(value),
                        "migrate:down" => scripts.migrate_down = Some(value),
                        "migrate:init" => scripts.migrate_init = Some(value),
                        "migrate:up" => scripts.migrate_up = Some(value),
                        "seed" => scripts.seed = Some(value),
                        "start" => scripts.start = Some(value),
                        "start:server" => scripts.start_server = Some(value),
                        "start:worker" => scripts.start_worker = Some(value),
                        "test" => scripts.test = Some(value),
                        _ => {
                            scripts.additional_scripts.insert(key, value);
                        }
                    }
                }

                Ok(scripts)
            }
        }

        deserializer.deserialize_map(ProjectScriptsVisitor)
    }
}

#[derive(Debug, Default, Clone)]
pub struct ProjectDependencies {
    pub app_name: String,
    pub bullmq: Option<String>,
    pub databases: HashSet<Database>,
    pub app_core: Option<String>,
    pub app_monitoring: Option<String>,
    pub forklaunch_common: Option<String>,
    pub forklaunch_core: Option<String>,
    pub forklaunch_express: Option<String>,
    pub forklaunch_hyper_express: Option<String>,
    pub forklaunch_implementation_billing_base: Option<String>,
    pub forklaunch_interfaces_billing: Option<String>,
    pub forklaunch_implementation_iam_base: Option<String>,
    pub forklaunch_interfaces_iam: Option<String>,
    pub forklaunch_implementation_worker_bullmq: Option<String>,
    pub forklaunch_implementation_worker_redis: Option<String>,
    pub forklaunch_implementation_worker_database: Option<String>,
    pub forklaunch_implementation_worker_kafka: Option<String>,
    pub forklaunch_interfaces_worker: Option<String>,
    pub forklaunch_validator: Option<String>,
    pub mikro_orm_core: Option<String>,
    pub mikro_orm_migrations: Option<String>,
    pub mikro_orm_database: Option<String>,
    pub mikro_orm_reflection: Option<String>,
    pub mikro_orm_seeder: Option<String>,
    pub typebox: Option<String>,
    pub ajv: Option<String>,
    pub better_sqlite3: Option<String>,
    pub dotenv: Option<String>,
    pub sqlite3: Option<String>,
    pub uuid: Option<String>,
    pub zod: Option<String>,

    pub additional_deps: HashMap<String, String>,
}

impl Serialize for ProjectDependencies {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(None)?;

        if let Some(ref v) = self.app_core {
            map.serialize_entry(&format!("@{}/core", self.app_name), v)?;
        }
        if let Some(ref v) = self.app_monitoring {
            map.serialize_entry(&format!("@{}/monitoring", self.app_name), v)?;
        }
        if let Some(ref v) = self.forklaunch_common {
            map.serialize_entry("@forklaunch/common", v)?;
        }
        if let Some(ref v) = self.forklaunch_core {
            map.serialize_entry("@forklaunch/core", v)?;
        }
        if let Some(ref v) = self.forklaunch_express {
            map.serialize_entry("@forklaunch/express", v)?;
        }
        if let Some(ref v) = self.forklaunch_hyper_express {
            map.serialize_entry("@forklaunch/hyper-express", v)?;
        }
        if let Some(ref v) = self.forklaunch_implementation_billing_base {
            map.serialize_entry("@forklaunch/implementation-billing-base", v)?;
        }
        if let Some(ref v) = self.forklaunch_interfaces_billing {
            map.serialize_entry("@forklaunch/interfaces-billing", v)?;
        }
        if let Some(ref v) = self.forklaunch_implementation_iam_base {
            map.serialize_entry("@forklaunch/implementation-iam-base", v)?;
        }
        if let Some(ref v) = self.forklaunch_interfaces_iam {
            map.serialize_entry("@forklaunch/interfaces-iam", v)?;
        }
        if let Some(ref v) = self.forklaunch_implementation_worker_bullmq {
            map.serialize_entry("@forklaunch/implementation-worker-bullmq", v)?;
        }
        if let Some(ref v) = self.forklaunch_implementation_worker_redis {
            map.serialize_entry("@forklaunch/implementation-worker-redis", v)?;
        }
        if let Some(ref v) = self.forklaunch_implementation_worker_database {
            map.serialize_entry("@forklaunch/implementation-worker-database", v)?;
        }
        if let Some(ref v) = self.forklaunch_implementation_worker_kafka {
            map.serialize_entry("@forklaunch/implementation-worker-kafka", v)?;
        }
        if let Some(ref v) = self.forklaunch_interfaces_worker {
            map.serialize_entry("@forklaunch/interfaces-worker", v)?;
        }
        if let Some(ref v) = self.forklaunch_validator {
            map.serialize_entry("@forklaunch/validator", v)?;
        }
        if let Some(ref v) = self.mikro_orm_core {
            map.serialize_entry("@mikro-orm/core", v)?;
        }
        if let Some(ref v) = self.mikro_orm_migrations {
            for database in &self.databases {
                if database == &Database::MongoDB {
                    map.serialize_entry("@mikro-orm/migrations-mongodb", v)?;
                } else {
                    map.serialize_entry("@mikro-orm/migrations", v)?;
                }
            }
        }
        if let Some(ref v) = self.mikro_orm_database {
            for database in &self.databases {
                map.serialize_entry(&format!("@mikro-orm/{}", database.to_string()), v)?;
            }
        }
        if let Some(ref v) = self.mikro_orm_reflection {
            map.serialize_entry("@mikro-orm/reflection", v)?;
        }
        if let Some(ref v) = self.mikro_orm_seeder {
            map.serialize_entry("@mikro-orm/seeder", v)?;
        }
        if let Some(ref v) = self.typebox {
            map.serialize_entry("@sinclair/typebox", v)?;
        }
        if let Some(ref v) = self.ajv {
            map.serialize_entry("ajv", v)?;
        }
        if let Some(ref v) = self.bullmq {
            map.serialize_entry("bullmq", v)?;
        }
        if let Some(ref v) = self.better_sqlite3 {
            map.serialize_entry("better-sqlite3", v)?;
        }
        if let Some(ref v) = self.dotenv {
            map.serialize_entry("dotenv", v)?;
        }
        if let Some(ref v) = self.sqlite3 {
            map.serialize_entry("sqlite3", v)?;
        }
        if let Some(ref v) = self.uuid {
            map.serialize_entry("uuid", v)?;
        }
        if let Some(ref v) = self.zod {
            map.serialize_entry("zod", v)?;
        }

        for (key, value) in &self.additional_deps {
            map.serialize_entry(key, value)?;
        }

        map.end()
    }
}

impl<'de> Deserialize<'de> for ProjectDependencies {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use std::fmt;

        use serde::de::{MapAccess, Visitor};

        struct DependenciesVisitor;

        impl<'de> Visitor<'de> for DependenciesVisitor {
            type Value = ProjectDependencies;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a map of dependencies")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut deps = ProjectDependencies::default();

                while let Some((key, value)) = access.next_entry::<String, String>()? {
                    if key == "app_name" {
                        continue;
                    }
                    if deps.app_name.len() > 0
                        && key.starts_with(&format!("{}", deps.app_name))
                        && key.ends_with("core")
                    {
                        deps.app_core = Some(value);
                        continue;
                    }
                    if deps.app_name.len() > 0
                        && key.starts_with(&format!("{}", deps.app_name))
                        && key.ends_with("monitoring")
                    {
                        deps.app_monitoring = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("mongodb") {
                        deps.databases.insert(Database::MongoDB);
                        if key.contains("migrations") {
                            deps.mikro_orm_migrations = Some(value);
                        } else {
                            deps.mikro_orm_database = Some(value);
                        }
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("postgresql") {
                        deps.databases.insert(Database::PostgreSQL);
                        if key.contains("migrations") {
                            deps.mikro_orm_migrations = Some(value);
                        } else {
                            deps.mikro_orm_database = Some(value);
                        }
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("mysql") {
                        deps.databases.insert(Database::MySQL);
                        if key.contains("migrations") {
                            deps.mikro_orm_migrations = Some(value);
                        } else {
                            deps.mikro_orm_database = Some(value);
                        }
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("mariadb") {
                        deps.databases.insert(Database::MariaDB);
                        if key.contains("migrations") {
                            deps.mikro_orm_migrations = Some(value);
                        } else {
                            deps.mikro_orm_database = Some(value);
                        }
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("sqlite") {
                        deps.databases.insert(Database::SQLite);
                        deps.mikro_orm_database = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("better-sqlite") {
                        deps.databases.insert(Database::BetterSQLite);
                        deps.better_sqlite3 = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("libsql") {
                        deps.databases.insert(Database::LibSQL);
                        deps.mikro_orm_database = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("mssql") {
                        deps.databases.insert(Database::MsSQL);
                        deps.mikro_orm_database = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("migrations") {
                        deps.mikro_orm_migrations = Some(value);
                        continue;
                    }

                    match key.as_str() {
                        "@forklaunch/common" => deps.forklaunch_common = Some(value),
                        "@forklaunch/core" => deps.forklaunch_core = Some(value),
                        "@forklaunch/express" => deps.forklaunch_express = Some(value),
                        "@forklaunch/hyper-express" => deps.forklaunch_hyper_express = Some(value),
                        "@forklaunch/implementation-billing-base" => {
                            deps.forklaunch_implementation_billing_base = Some(value)
                        }
                        "@forklaunch/interfaces-billing" => {
                            deps.forklaunch_interfaces_billing = Some(value)
                        }
                        "@forklaunch/implementation-iam-base" => {
                            deps.forklaunch_implementation_iam_base = Some(value)
                        }
                        "@forklaunch/interfaces-iam" => {
                            deps.forklaunch_interfaces_iam = Some(value)
                        }
                        "@forklaunch/implementation-worker-bullmq" => {
                            deps.forklaunch_implementation_worker_bullmq = Some(value)
                        }
                        "@forklaunch/implementation-worker-redis" => {
                            deps.forklaunch_implementation_worker_redis = Some(value)
                        }
                        "@forklaunch/implementation-worker-database" => {
                            deps.forklaunch_implementation_worker_database = Some(value)
                        }
                        "@forklaunch/implementation-worker-kafka" => {
                            deps.forklaunch_implementation_worker_kafka = Some(value)
                        }
                        "@forklaunch/interfaces-worker" => {
                            deps.forklaunch_interfaces_worker = Some(value)
                        }
                        "@forklaunch/validator" => deps.forklaunch_validator = Some(value),
                        "@mikro-orm/core" => deps.mikro_orm_core = Some(value),
                        "@mikro-orm/reflection" => deps.mikro_orm_reflection = Some(value),
                        "@mikro-orm/seeder" => deps.mikro_orm_seeder = Some(value),
                        "@sinclair/typebox" => deps.typebox = Some(value),
                        "ajv" => deps.ajv = Some(value),
                        "bullmq" => deps.bullmq = Some(value),
                        "better-sqlite3" => deps.better_sqlite3 = Some(value),
                        "dotenv" => deps.dotenv = Some(value),
                        "sqlite3" => deps.sqlite3 = Some(value),
                        "uuid" => deps.uuid = Some(value),
                        "zod" => deps.zod = Some(value),
                        _ => {
                            deps.additional_deps.insert(key, value);
                        }
                    }
                }

                Ok(deps)
            }
        }

        deserializer.deserialize_map(DependenciesVisitor)
    }
}

#[derive(Debug, Serialize, Default)]
pub struct ProjectDevDependencies {
    #[serde(rename = "@biomejs/biome", skip_serializing_if = "Option::is_none")]
    pub biome: Option<String>,
    #[serde(rename = "@eslint/js", skip_serializing_if = "Option::is_none")]
    pub eslint_js: Option<String>,
    #[serde(rename = "@mikro-orm/cli", skip_serializing_if = "Option::is_none")]
    pub mikro_orm_cli: Option<String>,
    #[serde(rename = "@types/express", skip_serializing_if = "Option::is_none")]
    pub types_express: Option<String>,
    #[serde(
        rename = "@types/express-serve-static-core",
        skip_serializing_if = "Option::is_none"
    )]
    pub types_express_serve_static_core: Option<String>,
    #[serde(rename = "@types/qs", skip_serializing_if = "Option::is_none")]
    pub types_qs: Option<String>,
    #[serde(rename = "@types/uuid", skip_serializing_if = "Option::is_none")]
    pub types_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eslint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oxlint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prettier: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tsx: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub typedoc: Option<String>,
    #[serde(rename = "typescript-eslint", skip_serializing_if = "Option::is_none")]
    pub typescript_eslint: Option<String>,

    #[serde(flatten)]
    pub additional_deps: HashMap<String, String>,
}

impl<'de> Deserialize<'de> for ProjectDevDependencies {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct ProjectDevDependenciesVisitor;

        impl<'de> Visitor<'de> for ProjectDevDependenciesVisitor {
            type Value = ProjectDevDependencies;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a map of dev dependency names to versions")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: serde::de::MapAccess<'de>,
            {
                let mut deps = ProjectDevDependencies {
                    biome: None,
                    eslint_js: None,
                    mikro_orm_cli: None,
                    types_express: None,
                    types_express_serve_static_core: None,
                    types_qs: None,
                    types_uuid: None,
                    eslint: None,
                    oxlint: None,
                    prettier: None,
                    tsx: None,
                    typedoc: None,
                    typescript_eslint: None,
                    additional_deps: HashMap::new(),
                };

                while let Some((key, value)) = access.next_entry::<String, String>()? {
                    match key.as_str() {
                        "@biomejs/biome" => deps.biome = Some(value),
                        "@eslint/js" => deps.eslint_js = Some(value),
                        "@mikro-orm/cli" => deps.mikro_orm_cli = Some(value),
                        "@types/express" => deps.types_express = Some(value),
                        "@types/express-serve-static-core" => {
                            deps.types_express_serve_static_core = Some(value)
                        }
                        "@types/qs" => deps.types_qs = Some(value),
                        "@types/uuid" => deps.types_uuid = Some(value),
                        "eslint" => deps.eslint = Some(value),
                        "oxlint" => deps.oxlint = Some(value),
                        "prettier" => deps.prettier = Some(value),
                        "tsx" => deps.tsx = Some(value),
                        "typedoc" => deps.typedoc = Some(value),
                        "typescript-eslint" => deps.typescript_eslint = Some(value),
                        _ => {
                            deps.additional_deps.insert(key, value);
                        }
                    }
                }

                Ok(deps)
            }
        }

        deserializer.deserialize_map(ProjectDevDependenciesVisitor)
    }
}

pub(crate) static MIKRO_ORM_CONFIG_PATHS: &[&str] =
    &["./mikro-orm.config.ts", "./dist/mikro-orm.config.js"];

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ProjectMikroOrm {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_paths: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Default)]
pub struct ProjectPackageJson {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub main: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scripts: Option<ProjectScripts>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<ProjectDependencies>,
    #[serde(rename = "devDependencies", skip_serializing_if = "Option::is_none")]
    pub dev_dependencies: Option<ProjectDevDependencies>,
    #[serde(rename = "mikro-orm", skip_serializing_if = "Option::is_none")]
    pub mikro_orm: Option<ProjectMikroOrm>,

    #[serde(flatten)]
    pub additional_entries: HashMap<String, serde_json::Value>,
}

impl<'de> Deserialize<'de> for ProjectPackageJson {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct ProjectPackageJsonVisitor;

        impl<'de> Visitor<'de> for ProjectPackageJsonVisitor {
            type Value = ProjectPackageJson;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a package.json object")
            }

            fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
            where
                M: serde::de::MapAccess<'de>,
            {
                let mut package = ProjectPackageJson {
                    name: None,
                    version: None,
                    description: None,
                    keywords: None,
                    license: None,
                    author: None,
                    main: None,
                    scripts: None,
                    dependencies: None,
                    dev_dependencies: None,
                    mikro_orm: None,
                    additional_entries: HashMap::new(),
                };

                while let Some((key, value)) = access.next_entry::<String, serde_json::Value>()? {
                    match key.as_str() {
                        "name" => {
                            package.name = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "version" => {
                            package.version = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "description" => {
                            package.description = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "keywords" => {
                            package.keywords = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "license" => {
                            package.license = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "author" => {
                            package.author = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "main" => {
                            package.main = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "scripts" => {
                            package.scripts = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "dependencies" => {
                            package.dependencies = Some(
                                serde_json::from_value::<ProjectDependencies>(
                                    serde_json::to_value(ProjectDependenciesWithProjectName {
                                        project_dependencies_value: value,
                                        app_name: package
                                            .name
                                            .clone()
                                            .unwrap()
                                            .split('/')
                                            .collect::<Vec<&str>>()[0]
                                            .to_string(),
                                    })
                                    .map_err(serde::de::Error::custom)?,
                                )
                                .map_err(serde::de::Error::custom)?,
                            )
                        }
                        "devDependencies" => {
                            package.dev_dependencies = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        "mikro-orm" => {
                            package.mikro_orm = Some(
                                serde_json::from_value(value).map_err(serde::de::Error::custom)?,
                            )
                        }
                        _ => {
                            package.additional_entries.insert(key, value);
                        }
                    }
                }

                Ok(package)
            }
        }

        deserializer.deserialize_map(ProjectPackageJsonVisitor)
    }
}
