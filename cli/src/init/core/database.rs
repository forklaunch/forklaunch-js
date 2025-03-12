use std::{collections::HashSet, fs::read_to_string, path::Path};

use anyhow::{bail, Context, Result};
use serde_json::{from_str, to_string_pretty, to_value, Value};

use crate::{
    constants::{ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS, ERROR_UNSUPPORTED_DATABASE},
    init::TEMPLATES_DIR,
};

use super::{
    package_json::package_json_constants::MIKRO_ORM_DATABASE_VERSION,
    rendered_template::RenderedTemplate, template::TemplateManifestData,
};

pub(crate) fn match_database(database: &str) -> String {
    match database {
        "mongodb" => "MongoDriver".to_string(),
        "postgresql" => "PostgreSqlDriver".to_string(),
        "sqlite" => "SqliteDriver".to_string(),
        "mysql" => "MySqlDriver".to_string(),
        _ => "PostgreSqlDriver".to_string(),
    }
}

pub(crate) fn generate_database_export_index_ts(
    base_path: &String,
    databases: Option<Vec<String>>,
    config_data: Option<&TemplateManifestData>,
) -> Result<RenderedTemplate> {
    let mut export_set = HashSet::new();
    let mut database_set = HashSet::new();

    let projects = match config_data {
        Some(TemplateManifestData::Service(service)) => service.projects.clone(),
        Some(TemplateManifestData::Worker(worker)) => worker.projects.clone(),
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

    database_set.iter().for_each(|database| {
        let export_string = match database.as_str() {
            "mongodb" => Some("mongo.base.entity"),
            "postgresql" => Some("base.entity"),
            "sqlite" => Some("base.entity"),
            "mysql" => Some("base.entity"),
            _ => None,
        };

        if let Some(export_string) = export_string {
            export_set.insert(format!("export * from './persistence/{}'", export_string));
        }
    });

    Ok(RenderedTemplate {
        path: Path::new(&base_path)
            .join("core")
            .join("models")
            .join("index.ts"),
        content: export_set.into_iter().collect::<Vec<String>>().join("\n"),
        context: None,
    })
}

pub(crate) fn update_core_package_json(
    config_data: &TemplateManifestData,
    base_path: &String,
) -> Result<RenderedTemplate> {
    let package_json_path = Path::new(base_path).join("core").join("package.json");
    let package_json_content = read_to_string(&package_json_path)?;
    let mut full_package_json: Value = from_str(&package_json_content)?;

    let is_postgres = match config_data {
        TemplateManifestData::Service(service) => service.is_postgres,
        TemplateManifestData::Worker(worker) => worker.is_postgres,
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let is_mongo = match config_data {
        TemplateManifestData::Service(service) => service.is_mongo,
        TemplateManifestData::Worker(worker) => worker.is_mongo,
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let dependencies = full_package_json["dependencies"].as_object_mut().unwrap();

    if is_postgres {
        if !dependencies.contains_key("@mikro-orm/postgresql") {
            dependencies.insert(
                "@mikro-orm/postgresql".to_string(),
                Value::String(MIKRO_ORM_DATABASE_VERSION.to_string()),
            );
        }
    }

    if is_mongo {
        if !dependencies.contains_key("@mikro-orm/mongodb") {
            dependencies.insert(
                "@mikro-orm/mongodb".to_string(),
                Value::String(MIKRO_ORM_DATABASE_VERSION.to_string()),
            );
        }
    }

    full_package_json["dependencies"] = to_value(dependencies)?;

    Ok(RenderedTemplate {
        path: package_json_path,
        content: to_string_pretty(&full_package_json)?,
        context: None,
    })
}

pub(crate) fn add_base_entity_to_core(
    config_data: &TemplateManifestData,
    base_path: &String,
) -> Result<Vec<RenderedTemplate>> {
    let database = match config_data {
        TemplateManifestData::Service(service) => service.database.clone(),
        TemplateManifestData::Worker(worker) => worker.database.clone(),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let (filename, template_path) = match database.as_str() {
        "mongodb" => ("mongo.base.entity.ts", "mongo.base.entity.ts"),
        "postgresql" => ("base.entity.ts", "base.entity.ts"),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let entity_path = Path::new(base_path)
        .join("core")
        .join("models")
        .join("persistence")
        .join(filename);

    let template = TEMPLATES_DIR.get_file(
        Path::new("project")
            .join("core")
            .join("models")
            .join("persistence")
            .join(template_path),
    );

    Ok(vec![
        RenderedTemplate {
            path: entity_path,
            content: template.unwrap().contents_utf8().unwrap().to_string(),
            context: None,
        },
        generate_database_export_index_ts(
            base_path,
            Some(vec![database.clone()]),
            Some(config_data),
        )
        .with_context(|| ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS)?,
        update_core_package_json(config_data, base_path)?,
    ])
}
