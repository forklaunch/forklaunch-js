use std::{
    env::current_exe,
    fs::{create_dir_all, read_dir, write},
    path::Path,
};

use anyhow::{Context, Result};
use ramhorns::Ramhorns;

use crate::{
    constants::{error_failed_to_create_dir, ERROR_FAILED_TO_GET_EXE_WD},
    init::{
        application::ApplicationConfigData, library::LibraryConfigData, service::ServiceConfigData,
    },
};

#[derive(Debug)]
pub(crate) struct PathIO {
    pub(crate) input_path: String,
    pub(crate) output_path: String,
}

#[derive(Debug)]
pub(crate) enum TemplateConfigData {
    Application(ApplicationConfigData),
    Service(ServiceConfigData),
    Library(LibraryConfigData),
}

pub(crate) fn get_template_path(path: &PathIO) -> Result<String> {
    Ok(current_exe()
        .with_context(|| ERROR_FAILED_TO_GET_EXE_WD)?
        .parent()
        .unwrap()
        .join(&path.input_path)
        .to_string_lossy()
        .to_string())
}

fn database_replacements(database: &String, template: String) -> String {
    match database.as_str() {
        "mongodb" => template
            .replace("BaseEntity", "MongoBaseEntity")
            .replace("id: uuid", "id: string"),
        _ => template,
    }
}

fn forklaunch_replacements(app_name: &String, template: String) -> String {
    template.replace("@forklaunch/framework-", format!("@{}/", app_name).as_str())
}

pub(crate) fn setup_with_template(
    output_prefix: Option<&String>,
    template_dir: &PathIO,
    template: &mut Ramhorns,
    data: &TemplateConfigData,
    ignore_files: &Vec<String>,
) -> Result<()> {
    let output_dir = match output_prefix {
        Some(output_prefix) => Path::new(output_prefix).join(&template_dir.output_path),
        None => Path::new(&template_dir.output_path).to_path_buf(),
    };

    for entry in read_dir(get_template_path(&template_dir).with_context(|| {
        format!(
            "Failed to read template directory {}.",
            template_dir.input_path
        )
    })?)
    .with_context(|| {
        format!(
            "Failed to parse template directory {}.",
            template_dir.input_path
        )
    })? {
        let entry = entry?;
        let path = entry.path();

        let output_path = output_dir.join(path.file_name().unwrap());
        if !output_path.exists() {
            create_dir_all(output_path.parent().unwrap())
                .with_context(|| error_failed_to_create_dir(&output_path.parent().unwrap()))?;
        }

        if path.is_file() {
            let tpl = template
                .from_file(&path.to_str().unwrap())
                .with_context(|| {
                    format!("Failed to parse template file {}.", path.to_string_lossy())
                })?;
            let rendered = match data {
                TemplateConfigData::Application(data) => {
                    forklaunch_replacements(&data.app_name, tpl.render(&data))
                }
                TemplateConfigData::Service(data) => database_replacements(
                    &data.database,
                    forklaunch_replacements(&data.app_name, tpl.render(&data)),
                ),
                TemplateConfigData::Library(data) => {
                    forklaunch_replacements(&data.app_name, tpl.render(&data))
                }
            };
            if !output_path.exists()
                && !ignore_files
                    .iter()
                    .any(|ignore_file| output_path.to_str().unwrap().contains(ignore_file))
            {
                write(&output_path, rendered).with_context(|| {
                    format!(
                        "Failed to write to {}. Please check your target directory is writable.",
                        output_path.to_string_lossy()
                    )
                })?;
            }
        } else if path.is_dir() {
            setup_with_template(
                output_prefix,
                &PathIO {
                    input_path: Path::new(&template_dir.input_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                    output_path: Path::new(&template_dir.output_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                },
                template,
                data,
                ignore_files,
            )
            .with_context(|| {
                format!("Failed to create templates for {}.", path.to_string_lossy())
            })?;
        }
    }

    Ok(())
}
