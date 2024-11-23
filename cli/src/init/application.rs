use std::fs;

use anyhow::bail;
use clap::{Arg, ArgMatches, Command};
use ramhorns::{Content, Ramhorns};

use crate::{utils::get_token, LATEST_CLI_VERSION};

use super::forklaunch_command;

// TODO: Add support for biome
pub(crate) fn command() -> Command {
    forklaunch_command("application", "Initialize a new full monorepo application")
        .alias("app")
        .arg(
            Arg::new("name")
                .required(true)
                .help("The name of the application"),
        )
        .arg(
            Arg::new("validator")
                .short('v')
                .long("validator")
                .required(true)
                .help("The validator to use. Valid values = [zod, typebox]")
                .value_parser(["zod", "typebox"]),
        )
        .arg(
            Arg::new("http-framework")
                .short('f')
                .long("http-framework")
                .required(true)
                .help("The framework to use. Valid values = [express, hyper-express]. Note hyper-express only supports node.")
                .value_parser(["express", "hyper-express"]),
        )
        .arg(
            Arg::new("runtime")
                .short('r')
                .long("runtime")
                .required(true)
                .help("The runtime to use. Valid values = [node, bun]")
                .value_parser(["node", "bun"]),
        )
        .arg(
            Arg::new("test-framework")
                .short('t')
                .long("test-framework")
                .required(true)
                .help("The test framework to use. Valid values = [vitest, jest]")
                .value_parser(["vitest", "jest"]),
        )
        .arg(
            Arg::new("packages")
                .short('p')
                .long("packages")
                .help("Additional packages to include. Valid values = [billing, iam, monitoring]")
                .value_parser(["billing", "iam", "monitoring"])
                .num_args(0..)
                .action(clap::ArgAction::Append),
        )
}

#[derive(Debug, Content)]
pub(crate) struct ConfigData {
    latest_cli_version: String,
    name: String,
    validator: String,
    http_framework: String,
    runtime: String,
    test_framework: String,
    token: String,
    generated_projects: Vec<String>,
}

pub(crate) fn apply_templates(
    name: &String,
    template_dir: &String,
    template: &mut Ramhorns,
    data: &ConfigData,
) -> anyhow::Result<()> {
    for entry in std::fs::read_dir(template_dir)? {
        let entry = entry?;
        let path = entry.path();

        let output_path = std::path::Path::new(name.as_str()).join(path.file_name().unwrap());
        println!(
            "{} -> {}",
            path.to_str().unwrap(),
            output_path.to_str().unwrap()
        );

        if path.is_file() {
            let tpl = template.from_file(&path.to_str().unwrap())?;
            let rendered = tpl.render(&data);
            std::fs::write(output_path, rendered)?;
        } else if path.is_dir() {
            std::fs::create_dir_all(output_path)?;
            apply_templates(name, &path.to_str().unwrap().to_string(), template, data)?;
        }
    }

    Ok(())
}

pub(crate) fn get_template_path(path: &str) -> anyhow::Result<String> {
    Ok(std::env::current_exe()?
        .parent()
        .unwrap()
        .join(path)
        .to_string_lossy()
        .to_string())
}

pub(crate) fn handler(matches: &ArgMatches) -> anyhow::Result<()> {
    let name = matches.get_one::<String>("name").unwrap();
    let validator = matches.get_one::<String>("validator").unwrap();
    let http_framework = matches.get_one::<String>("http-framework").unwrap();
    let runtime = matches.get_one::<String>("runtime").unwrap();
    let test_framework = matches.get_one::<String>("test-framework").unwrap();
    let packages = matches.get_many::<String>("packages").unwrap_or_default();

    if fs::exists(".forklaunch")? {
        bail!("A .forklaunch directory already exists. To regenerate, delete the directory and run the command again. Note the generated code will overwrite existing files.");
    }

    if runtime == "bun" && http_framework == "hyper-express" {
        bail!("Hyper Express is not supported for bun");
    }

    let token = get_token()?;

    let additional_projects = packages.map(|p| p.to_string());

    let data = ConfigData {
        latest_cli_version: LATEST_CLI_VERSION.to_string(),
        name: name.to_string(),
        validator: validator.to_string(),
        http_framework: http_framework.to_string(),
        runtime: runtime.to_string(),
        test_framework: test_framework.to_string(),
        token: token,
        generated_projects: {
            let mut projects = vec!["core".to_string()];
            projects.extend(additional_projects.clone());
            projects
        },
    };

    println!("{:?}", data);

    // TODO: support different path delimiters
    let mut template_dirs = vec![
        get_template_path(&"templates/application".to_string())?,
        get_template_path(&"templates/.forklaunch".to_string())?,
        get_template_path(&"templates/project/core".to_string())?,
    ];

    template_dirs.extend(
        additional_projects
            .clone()
            .map(|p| get_template_path(&format!("templates/project/{}", p))?),
    );

    for template_dir in template_dirs {
        println!("{}", std::env::current_dir()?.display());
        let mut template = Ramhorns::lazy(&template_dir)?;
        apply_templates(name, &template_dir, &mut template, &data)?;
    }

    Ok(())
}
