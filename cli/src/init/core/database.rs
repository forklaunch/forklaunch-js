use std::{collections::HashSet, path::Path};

use anyhow::{bail, Context, Result};

use crate::{
    constants::{ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS, ERROR_UNSUPPORTED_DATABASE},
    init::{service::ServiceManifestData, TEMPLATES_DIR},
};

use super::rendered_template::RenderedTemplate;

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
    config_data: Option<&ServiceManifestData>,
) -> Result<RenderedTemplate> {
    let mut export_set = HashSet::new();
    let mut database_set = HashSet::new();

    if let Some(config_data) = config_data {
        config_data.projects.iter().for_each(|project| {
            if let Some(resources) = &project.resources {
                if let Some(database) = &resources.database {
                    database_set.insert(database.to_string());
                }
            }
        });
    }

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
            export_set.insert(format!("export * from './entities/{}'", export_string));
        }
    });

    Ok(RenderedTemplate {
        path: Path::new(&base_path)
            .join("core")
            .join("persistence")
            .join("index.ts"),
        content: export_set.into_iter().collect::<Vec<String>>().join("\n"),
        context: None,
    })
}

pub(crate) fn add_base_entity_to_core(
    config_data: &ServiceManifestData,
    base_path: &String,
) -> Result<Vec<RenderedTemplate>> {
    let (filename, template_path) = match config_data.database.as_str() {
        "mongodb" => ("mongo.base.entity.ts", "mongo.base.entity.ts"),
        "postgresql" => ("base.entity.ts", "base.entity.ts"),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let entity_path = Path::new(base_path)
        .join("core")
        .join("persistence")
        .join("entities")
        .join(filename);

    let template = TEMPLATES_DIR.get_file(
        Path::new("project")
            .join("core")
            .join("persistence")
            .join("entities")
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
            Some(vec![config_data.database.to_string()]),
            Some(config_data),
        )
        .with_context(|| ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS)?,
    ])
}
