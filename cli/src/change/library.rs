use std::{fs::read_to_string, io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use convert_case::{Case, Casing};
use dialoguer::{theme::ColorfulTheme, MultiSelect};
use rustyline::{history::DefaultHistory, Editor};
use termcolor::{ColorChoice, StandardStream};
use walkdir::WalkDir;

use crate::{
    constants::{
        ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST,
        ERROR_FAILED_TO_READ_PACKAGE_JSON,
    },
    core::{
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        manifest::library::LibraryManifestData,
        package_json::project_package_json::ProjectPackageJson,
        removal_template::{remove_template_files, RemovalTemplate},
        rendered_template::{
            write_rendered_templates, RenderedTemplate, RenderedTemplatesCache, TEMPLATES_DIR,
        },
    },
    prompt::{prompt_field_from_selections_with_validation, ArrayCompleter},
    CliCommand,
};

#[derive(Debug)]
pub(super) struct LibraryCommand;

impl LibraryCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

fn change_name(
    base_path: &Path,
    name: &str,
    manifest_data: &mut LibraryManifestData,
    project_package_json: &mut ProjectPackageJson,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Vec<RemovalTemplate>> {
    let existing_name = base_path.file_name().unwrap().to_string_lossy().to_string();

    let mut removal_templates = vec![];

    manifest_data.library_name = name.to_string();
    manifest_data
        .projects
        .iter_mut()
        .find(|project| project.name == existing_name)
        .unwrap()
        .name = name.to_string();

    project_package_json.name = Some(format!("@{}/{}", manifest_data.app_name, name.to_string()));

    let existing_camel_case_name = existing_name.to_case(Case::Camel);
    let existing_kebab_case_name = existing_name.to_case(Case::Kebab);
    let existing_pascal_case_name = existing_name.to_case(Case::Pascal);

    // #TODO: move this into router change name function
    let camel_case_name = name.to_case(Case::Camel);
    let kebab_case_name = name.to_case(Case::Kebab);
    let pascal_case_name = name.to_case(Case::Pascal);

    TEMPLATES_DIR
        .get_dir("router")
        .unwrap()
        .entries()
        .into_iter()
        .for_each(|top_level_folder| {
            for entry in WalkDir::new(base_path.join(&top_level_folder.path().file_name().unwrap()))
            {
                let entry = entry.unwrap();
                if entry.file_type().is_file() {
                    let path = entry.path();
                    if let Some(template) = rendered_templates_cache.get(path).ok().unwrap() {
                        let content = template.content;
                        let new_content = content
                            .replace(&existing_pascal_case_name, &pascal_case_name)
                            .replace(&existing_kebab_case_name, &kebab_case_name)
                            .replace(&existing_camel_case_name, &camel_case_name)
                            .replace(&existing_name, &name);
                        let new_path = path
                            .to_string_lossy()
                            .replace(&existing_pascal_case_name, &pascal_case_name)
                            .replace(&existing_kebab_case_name, &kebab_case_name)
                            .replace(&existing_camel_case_name, &camel_case_name)
                            .replace(&existing_name, &name);
                        if content != new_content {
                            rendered_templates_cache.insert(
                                new_path.clone(),
                                RenderedTemplate {
                                    path: new_path.clone().into(),
                                    content: new_content,
                                    context: None,
                                },
                            );
                            if path.to_string_lossy() != new_path {
                                removal_templates.push(RemovalTemplate { path: path.into() })
                            }
                        }
                    }
                }
            }
        });

    Ok(removal_templates)
}

fn change_description(
    description: &str,
    manifest_data: &mut LibraryManifestData,
    project_package_json: &mut ProjectPackageJson,
) -> Result<()> {
    manifest_data.description = description.to_string();
    project_package_json.description = Some(description.to_string());

    Ok(())
}

impl CliCommand for LibraryCommand {
    fn command(&self) -> Command {
        command("library", "Change a forklaunch library")
            .alias("lib")
            .arg(
                Arg::new("base_path")
                    .short('p')
                    .long("path")
                    .help("The library path"),
            )
            .arg(Arg::new("name").short('N').help("The name of the library"))
            .arg(
                Arg::new("description")
                    .short('D')
                    .long("description")
                    .help("The description of the library"),
            )
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Library,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data: LibraryManifestData = toml::from_str(
            &read_to_string(&config_path).with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        manifest_data.library_name = base_path.file_name().unwrap().to_string_lossy().to_string();

        let name = matches.get_one::<String>("name");
        let description = matches.get_one::<String>("description");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if !matches.args_present() {
            let options = vec!["name", "database", "description", "infrastructure"];

            let selections = MultiSelect::with_theme(&ColorfulTheme::default())
                .with_prompt("What would you like to change?")
                .items(&options)
                .interact()?;

            if selections.is_empty() {
                writeln!(stdout, "No changes selected")?;
                return Ok(());
            }

            selections.iter().map(|i| options[*i]).collect()
        } else {
            vec![]
        };

        let name = prompt_field_from_selections_with_validation(
            "name",
            name,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter library name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Library name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let description = prompt_field_from_selections_with_validation(
            "description",
            description,
            &selected_options,
            &mut line_editor,
            &mut stdout,
            matches,
            "Enter project description (optional): ",
            None,
            |_input: &str| true,
            |_| "Invalid description. Please try again".to_string(),
        )?;

        let mut removal_templates = vec![];

        let project_package_json_path = base_path.join("package.json");
        let project_package_json_data = read_to_string(&project_package_json_path)
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?;

        let mut project_json_to_write =
            serde_json::from_str::<ProjectPackageJson>(&project_package_json_data)?;

        let mut rendered_templates_cache = RenderedTemplatesCache::new();

        if let Some(name) = name {
            removal_templates.extend(change_name(
                &base_path,
                &name,
                &mut manifest_data,
                &mut project_json_to_write,
                &mut rendered_templates_cache,
            )?);
        }
        if let Some(description) = description {
            change_description(&description, &mut manifest_data, &mut project_json_to_write)?;
        }

        rendered_templates_cache.insert(
            config_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
                context: None,
            },
        );

        rendered_templates_cache.insert(
            project_package_json_path
                .clone()
                .to_string_lossy()
                .to_string(),
            RenderedTemplate {
                path: project_package_json_path.into(),
                content: serde_json::to_string_pretty(&project_json_to_write)?,
                context: None,
            },
        );

        let rendered_templates: Vec<RenderedTemplate> = rendered_templates_cache
            .drain()
            .map(|(_, template)| template)
            .collect();

        write_rendered_templates(&rendered_templates, dryrun, &mut stdout)?;
        remove_template_files(&removal_templates, dryrun, &mut stdout)?;

        Ok(())
    }
}
