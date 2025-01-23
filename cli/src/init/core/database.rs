use std::path::Path;

use anyhow::{bail, Result};

use crate::{
    constants::ERROR_UNSUPPORTED_DATABASE,
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

pub(crate) fn add_base_entity_to_core(
    config_data: &ServiceManifestData,
    base_path: &Path,
) -> Result<Vec<RenderedTemplate>> {
    let (filename, template_path) = match config_data.database.as_str() {
        "mongodb" => ("mongo.base.entity.ts", "mongo.base.entity.ts"),
        "postgresql" => ("base.entity.ts", "base.entity.ts"),
        _ => bail!(ERROR_UNSUPPORTED_DATABASE),
    };

    let entity_path = base_path
        .join("core")
        .join("persistence")
        .join("entities")
        .join(filename);

    let template = TEMPLATES_DIR.get_file(
        base_path
            .join("core")
            .join("persistence")
            .join("entities")
            .join(template_path),
    );

    Ok(vec![RenderedTemplate {
        path: entity_path,
        content: template.unwrap().contents_utf8().unwrap().to_string(),
        context: None,
    }])
}
