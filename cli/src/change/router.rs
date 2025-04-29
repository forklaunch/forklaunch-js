use std::path::Path;

use anyhow::Result;
use clap::{Arg, Command};
use convert_case::{Case, Casing};
use walkdir::WalkDir;

use crate::{
    core::{
        command::command,
        manifest::ProjectEntry,
        removal_template::RemovalTemplate,
        rendered_template::{RenderedTemplate, RenderedTemplatesCache},
    },
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
    }

    fn handler(&self, matches: &clap::ArgMatches) -> anyhow::Result<()> {
        todo!()
    }
}
