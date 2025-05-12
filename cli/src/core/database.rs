use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::{Context, Result, bail};
use serde_json::{from_str, to_string_pretty};

use super::{
    manifest::ManifestData,
    package_json::{
        package_json_constants::{
            BETTER_SQLITE_POSTINSTALL_SCRIPT, MIKRO_ORM_DATABASE_VERSION, SQLITE_POSTINSTALL_SCRIPT,
        },
        project_package_json::ProjectPackageJson,
    },
    rendered_template::{RenderedTemplate, TEMPLATES_DIR},
};
use crate::constants::{
    Database, ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS, ERROR_UNSUPPORTED_DATABASE, Runtime,
};

pub(crate) fn get_db_driver(database: &Database) -> String {
    match database {
        Database::MongoDB => "MongoDriver".to_string(),
        Database::PostgreSQL => "PostgreSqlDriver".to_string(),
        Database::SQLite => "SqliteDriver".to_string(),
        Database::MySQL => "MySqlDriver".to_string(),
        Database::MariaDB => "MariaDbDriver".to_string(),
        Database::BetterSQLite => "BetterSqliteDriver".to_string(),
        Database::LibSQL => "LibSqlDriver".to_string(),
        Database::MsSQL => "MsSqlDriver".to_string(),
    }
}

pub(crate) fn get_database_port(database: &Database) -> Option<String> {
    match database {
        Database::MongoDB => Some("27017".to_string()),
        Database::PostgreSQL => Some("5432".to_string()),
        Database::SQLite => None,
        Database::MySQL => Some("3306".to_string()),
        Database::MariaDB => Some("3306".to_string()),
        Database::BetterSQLite => None,
        Database::LibSQL => None,
        Database::MsSQL => Some("1433".to_string()),
    }
}

pub(crate) fn generate_index_ts_database_export(
    base_path: &Path,
    databases: Option<Vec<String>>,
    config_data: Option<&ManifestData>,
) -> Result<RenderedTemplate> {
    let mut export_set = HashSet::new();
    let mut database_set = HashSet::new();

    let projects = match config_data {
        Some(ManifestData::Service(service)) => service.projects.clone(),
        Some(ManifestData::Worker(worker)) => worker.projects.clone(),
        _ => vec![],
    };

    projects.iter().for_each(|project| {
        if let Some(resources) = &project.resources {
            if let Some(database) = &resources.database {
                database_set.insert(database.to_string());
            }
        }
    });

    database_set.extend(databases.unwrap_or_default());

    database_set
        .iter()
        .map(|database| {
            let export_string = match database.parse::<Database>()? {
                Database::MongoDB => Some("nosql.base.entity"),
                Database::PostgreSQL => Some("sql.base.entity"),
                Database::SQLite => Some("sql.base.entity"),
                Database::MySQL => Some("sql.base.entity"),
                Database::MariaDB => Some("sql.base.entity"),
                Database::MsSQL => Some("sql.base.entity"),
                Database::BetterSQLite => Some("sql.base.entity"),
                Database::LibSQL => Some("sql.base.entity"),
            };

            if let Some(export_string) = export_string {
                export_set.insert(format!("export * from './{}'", export_string));
            }

            Ok(())
        })
        .collect::<Result<Vec<()>>>()?;

    Ok(RenderedTemplate {
        path: Path::new(&base_path)
            .join("core")
            .join("persistence")
            .join("index.ts"),
        content: export_set.into_iter().collect::<Vec<String>>().join("\n"),
        context: None,
    })
}

pub(crate) fn update_core_package_json(
    config_data: &ManifestData,
    base_path: &Path,
) -> Result<RenderedTemplate> {
    let package_json_path = base_path.join("core").join("package.json");
    let package_json_content = read_to_string(&package_json_path)?;
    let mut full_package_json: ProjectPackageJson = from_str(&package_json_content)?;

    let database = match config_data {
        ManifestData::Service(service) => Some(service.database.clone()),
        ManifestData::Worker(worker) => worker.database.clone(),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    full_package_json.dependencies.as_mut().unwrap().database = database.clone();
    if database.is_some() {
        full_package_json
            .dependencies
            .as_mut()
            .unwrap()
            .mikro_orm_database = Some(MIKRO_ORM_DATABASE_VERSION.to_string());
    }

    Ok(RenderedTemplate {
        path: package_json_path,
        content: to_string_pretty(&full_package_json)?,
        context: None,
    })
}

pub(crate) fn get_base_entity_filename(database: &Database) -> Result<&str> {
    match database {
        Database::MongoDB => Ok("nosql.base.entity.ts"),
        Database::PostgreSQL => Ok("sql.base.entity.ts"),
        Database::SQLite => Ok("sql.base.entity.ts"),
        Database::MySQL => Ok("sql.base.entity.ts"),
        Database::MariaDB => Ok("sql.base.entity.ts"),
        Database::BetterSQLite => Ok("sql.base.entity.ts"),
        Database::LibSQL => Ok("sql.base.entity.ts"),
        Database::MsSQL => Ok("sql.base.entity.ts"),
    }
}

pub(crate) fn add_base_entity_to_core(
    config_data: &ManifestData,
    base_path: &Path,
) -> Result<Vec<RenderedTemplate>> {
    let database = match config_data {
        ManifestData::Service(service) => service.database.clone(),
        ManifestData::Worker(worker) => worker.database.clone().unwrap(),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let database = database.parse::<Database>()?;
    let filename = get_base_entity_filename(&database)?;

    let entity_path = base_path
        .join("core")
        .join("persistence")
        .join(filename);

    let template = TEMPLATES_DIR.get_file(
        Path::new("project")
            .join("core")
            .join("persistence")
            .join(filename),
    );

    Ok(vec![
        RenderedTemplate {
            path: entity_path,
            content: template.unwrap().contents_utf8().unwrap().to_string(),
            context: None,
        },
        generate_index_ts_database_export(
            base_path,
            Some(vec![database.to_string()]),
            Some(config_data),
        )
        .with_context(|| ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS)?,
        update_core_package_json(config_data, base_path)?,
    ])
}

pub(crate) fn is_in_memory_database(database: &Database) -> bool {
    match database {
        Database::SQLite => true,
        Database::BetterSQLite => true,
        Database::LibSQL => true,
        _ => false,
    }
}

pub(crate) fn get_postinstall_script(database: &Database) -> Option<String> {
    match database {
        Database::SQLite => Some(SQLITE_POSTINSTALL_SCRIPT.to_string()),
        Database::BetterSQLite => Some(BETTER_SQLITE_POSTINSTALL_SCRIPT.to_string()),
        _ => None,
    }
}

pub(crate) fn get_database_variants(runtime: &Runtime) -> &[&str] {
    match runtime {
        Runtime::Bun => &Database::VARIANTS[..Database::VARIANTS.len() - 1],
        Runtime::Node => &Database::VARIANTS[..],
    }
}
