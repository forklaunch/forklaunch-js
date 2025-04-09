use serde::{Deserialize, Serialize, Serializer};

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ProjectScripts {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clean: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dev: Option<String>,
    #[serde(rename = "dev:server", skip_serializing_if = "Option::is_none")]
    pub dev_server: Option<String>,
    #[serde(rename = "dev:client", skip_serializing_if = "Option::is_none")]
    pub dev_client: Option<String>,
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
    #[serde(rename = "start:client", skip_serializing_if = "Option::is_none")]
    pub start_client: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test: Option<String>,
}

impl Serialize for ProjectDependencies {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(None)?;

        // Custom serialization for app-specific dependency
        if let Some(ref version) = self.app_core {
            map.serialize_entry(&format!("@{}/core", self.app_name), version)?;
        }
        if let Some(ref version) = self.app_monitoring {
            map.serialize_entry(&format!("@{}/monitoring", self.app_name), version)?;
        }
        // Default serialization for all other dependencies
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
        if let Some(ref v) = self.forklaunch_validator {
            map.serialize_entry("@forklaunch/validator", v)?;
        }
        if let Some(ref v) = self.mikro_orm_core {
            map.serialize_entry("@mikro-orm/core", v)?;
        }
        if let Some(ref v) = self.mikro_orm_migrations {
            if let Some(ref database) = self.database {
                if database == "mongodb" {
                    map.serialize_entry("@mikro-orm/migrations-mongodb", v)?;
                } else {
                    map.serialize_entry("@mikro-orm/migrations", v)?;
                }
            }
        }
        if let Some(ref v) = self.mikro_orm_database {
            if let Some(ref database) = self.database {
                map.serialize_entry(&format!("@mikro-orm/{}", database), v)?;
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
        if let Some(ref v) = self.dotenv {
            map.serialize_entry("dotenv", v)?;
        }
        if let Some(ref v) = self.uuid {
            map.serialize_entry("uuid", v)?;
        }
        if let Some(ref v) = self.zod {
            map.serialize_entry("zod", v)?;
        }

        map.end()
    }
}

impl<'de> Deserialize<'de> for ProjectDependencies {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{MapAccess, Visitor};
        use std::fmt;

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
                    // Extract app name from any "@{app_name}/core" pattern
                    if key.starts_with('@') && key.ends_with("/core") {
                        deps.app_name = key[1..key.len() - 5].to_string();
                        deps.app_core = Some(value);
                        continue;
                    }
                    if key.starts_with('@') && key.ends_with("/monitoring") {
                        deps.app_monitoring = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("mongodb") {
                        deps.database = if key.ends_with("mongodb") {
                            Some("mongodb".to_string())
                        } else {
                            Some("postgresql".to_string())
                        };
                        deps.mikro_orm_migrations = Some(value);
                        continue;
                    }
                    if key.starts_with("@mikro-orm") && key.ends_with("postgresql") {
                        deps.database = Some("postgresql".to_string());
                        if key.contains("migrations") {
                            deps.mikro_orm_migrations = Some(value);
                        } else {
                            deps.mikro_orm_database = Some(value);
                        }
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
                        "@forklaunch/validator" => deps.forklaunch_validator = Some(value),
                        "@mikro-orm/core" => deps.mikro_orm_core = Some(value),
                        "@mikro-orm/reflection" => deps.mikro_orm_reflection = Some(value),
                        "@mikro-orm/seeder" => deps.mikro_orm_seeder = Some(value),
                        "@sinclair/typebox" => deps.typebox = Some(value),
                        "ajv" => deps.ajv = Some(value),
                        "dotenv" => deps.dotenv = Some(value),
                        "uuid" => deps.uuid = Some(value),
                        "zod" => deps.zod = Some(value),
                        _ => {}
                    }
                }

                Ok(deps)
            }
        }

        deserializer.deserialize_map(DependenciesVisitor)
    }
}

#[derive(Debug, Default)]
pub struct ProjectDependencies {
    pub app_name: String,
    pub database: Option<String>,
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
    pub forklaunch_validator: Option<String>,
    pub mikro_orm_core: Option<String>,
    pub mikro_orm_migrations: Option<String>,
    pub mikro_orm_database: Option<String>,
    pub mikro_orm_reflection: Option<String>,
    pub mikro_orm_seeder: Option<String>,
    pub typebox: Option<String>,
    pub ajv: Option<String>,
    pub dotenv: Option<String>,
    pub uuid: Option<String>,
    pub zod: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ProjectDevDependencies {
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
    pub tsx: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub typedoc: Option<String>,
    #[serde(rename = "typescript-eslint", skip_serializing_if = "Option::is_none")]
    pub typescript_eslint: Option<String>,
}

pub(crate) static MIKRO_ORM_CONFIG_PATHS: &[&str] =
    &["./mikro-orm.config.ts", "./dist/mikro-orm.config.js"];

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ProjectMikroOrm {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_paths: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
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
}
