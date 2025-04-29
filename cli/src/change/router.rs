use std::{io::Write, path::Path};

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, Command};
use convert_case::{Case, Casing};
use dialoguer::{theme::ColorfulTheme, MultiSelect};
use rustyline::{history::DefaultHistory, Editor};
use termcolor::{ColorChoice, StandardStream};
use walkdir::WalkDir;

use crate::{
    constants::{ERROR_FAILED_TO_PARSE_MANIFEST, ERROR_FAILED_TO_READ_MANIFEST},
    core::{
        base_path::{prompt_base_path, BasePathLocation},
        command::command,
        manifest::{router::RouterManifestData, ProjectEntry},
        removal_template::{remove_template_files, RemovalTemplate},
        rendered_template::{write_rendered_templates, RenderedTemplate, RenderedTemplatesCache},
    },
    prompt::{prompt_field_from_selections_with_validation, ArrayCompleter},
    CliCommand,
};

#[derive(Debug)]
pub(super) struct RouterCommand;

impl RouterCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

pub(crate) fn change_name(
    base_path: &Path,
    existing_name: &str,
    name: &str,
    project_entry: &mut ProjectEntry,
    rendered_templates_cache: &mut RenderedTemplatesCache,
) -> Result<Vec<RemovalTemplate>> {
    let mut removal_templates = Vec::new();

    project_entry.routers = Some(
        project_entry
            .routers
            .as_ref()
            .unwrap()
            .iter()
            .map(|router| {
                if router == existing_name {
                    return name.to_string();
                }
                router.clone()
            })
            .collect(),
    );

    let existing_name = base_path.file_name().unwrap().to_string_lossy().to_string();

    let existing_camel_case_name = existing_name.to_case(Case::Camel);
    let existing_kebab_case_name = existing_name.to_case(Case::Kebab);
    let existing_pascal_case_name = existing_name.to_case(Case::Pascal);

    // #TODO: move this into router change name function
    let camel_case_name = name.to_case(Case::Camel);
    let kebab_case_name = name.to_case(Case::Kebab);
    let pascal_case_name = name.to_case(Case::Pascal);

    for entry in WalkDir::new(base_path) {
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

    Ok(removal_templates)
}

impl CliCommand for RouterCommand {
    fn command(&self) -> Command {
        command("router", "Change a forklaunch router")
            .arg(Arg::new("name").short('N').help("The name of the router"))
            .arg(
                Arg::new("dryrun")
                    .short('n')
                    .long("dryrun")
                    .help("Dry run the command")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &clap::ArgMatches) -> anyhow::Result<()> {
        let mut line_editor = Editor::<ArrayCompleter, DefaultHistory>::new()?;
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let mut rendered_templates_cache = RenderedTemplatesCache::new();

        let base_path_input = prompt_base_path(
            &mut line_editor,
            &mut stdout,
            matches,
            &BasePathLocation::Service,
        )?;
        let base_path = Path::new(&base_path_input);

        let config_path = &base_path.join(".forklaunch").join("manifest.toml");

        let mut manifest_data: RouterManifestData = toml::from_str(
            &rendered_templates_cache
                .get(&config_path)
                .with_context(|| ERROR_FAILED_TO_READ_MANIFEST)?
                .unwrap()
                .content,
        )
        .with_context(|| ERROR_FAILED_TO_PARSE_MANIFEST)?;
        manifest_data.router_name = base_path.file_name().unwrap().to_string_lossy().to_string();

        let name = matches.get_one::<String>("name");
        let dryrun = matches.get_flag("dryrun");

        let selected_options = if !matches.args_present() {
            let options = vec!["name"];

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
            "Enter router name: ",
            None,
            |input: &str| {
                !input.is_empty()
                    && !input.contains(' ')
                    && !input.contains('\t')
                    && !input.contains('\n')
                    && !input.contains('\r')
            },
            |_| "Router name cannot be empty or include spaces. Please try again".to_string(),
        )?;

        let mut removal_templates = vec![];

        if let Some(name) = name {
            removal_templates.extend(change_name(
                &base_path,
                &manifest_data.router_name,
                &name,
                &mut manifest_data
                    .projects
                    .iter_mut()
                    .find(|project| project.name == manifest_data.router_name)
                    .unwrap(),
                &mut rendered_templates_cache,
            )?);
        }

        rendered_templates_cache.insert(
            config_path.clone().to_string_lossy(),
            RenderedTemplate {
                path: config_path.to_path_buf(),
                content: toml::to_string_pretty(&manifest_data)?,
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
