use std::{fs::create_dir_all, path::Path};

use anyhow::{Context, Result};
use include_dir::{Dir, File};
use ramhorns::Template;

use crate::{
    constants::error_failed_to_create_dir,
    init::{
        application::ApplicationConfigData, library::LibraryConfigData, service::ServiceConfigData,
        TEMPLATES_DIR,
    },
};

use super::rendered_template::RenderedTemplate;

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

pub(crate) fn get_directory_filenames(path: &PathIO) -> Result<Vec<&File>> {
    Ok(TEMPLATES_DIR
        .get_dir(&path.input_path)
        .unwrap()
        .files()
        .collect())
}

pub(crate) fn get_directory_subdirectory_names(path: &PathIO) -> Result<Vec<&Dir>> {
    Ok(TEMPLATES_DIR
        .get_dir(&path.input_path)
        .unwrap()
        .dirs()
        .collect())
}

pub(crate) fn get_file_contents(filepath: &Path) -> Result<String> {
    Ok(TEMPLATES_DIR
        .get_file(filepath)
        .unwrap()
        .contents_utf8()
        .unwrap()
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

pub(crate) fn generate_with_template(
    output_prefix: Option<&String>,
    template_dir: &PathIO,
    data: &TemplateConfigData,
    ignore_files: &Vec<String>,
) -> Result<Vec<RenderedTemplate>> {
    let mut rendered_templates = Vec::new();

    let output_dir = match output_prefix {
        Some(output_prefix) => Path::new(output_prefix).join(&template_dir.output_path),
        None => Path::new(&template_dir.output_path).to_path_buf(),
    };

    for entry in get_directory_filenames(&template_dir)? {
        let output_path = output_dir.join(&entry.path().file_name().unwrap());
        if !output_path.exists() {
            create_dir_all(output_path.parent().unwrap())
                .with_context(|| error_failed_to_create_dir(&output_path.parent().unwrap()))?;
        }

        let tpl = Template::new(get_file_contents(&Path::new(&entry.path())).with_context(
            || {
                format!(
                    "Failed to parse template file {}",
                    &entry.path().to_string_lossy()
                )
            },
        )?)?;
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
            rendered_templates.push(RenderedTemplate {
                path: output_path,
                content: rendered,
                context: None,
            });
        }
    }

    for subdirectory in get_directory_subdirectory_names(&template_dir)? {
        rendered_templates.extend(
            generate_with_template(
                output_prefix,
                &PathIO {
                    input_path: Path::new(&subdirectory.path())
                        .to_string_lossy()
                        .to_string(),
                    output_path: Path::new(&template_dir.output_path)
                        .join(&subdirectory.path().file_name().unwrap())
                        .to_string_lossy()
                        .to_string(),
                },
                data,
                ignore_files,
            )
            .with_context(|| {
                format!(
                    "Failed to create templates for {}",
                    &subdirectory.path().to_string_lossy()
                )
            })?,
        );
    }

    Ok(rendered_templates)
}
