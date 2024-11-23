use anyhow::bail;
use clap::{Arg, ArgMatches, Command};
use ramhorns::Ramhorns;

use crate::utils::get_token;

use super::forklaunch_command;

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
                .short('h')
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

pub(crate) fn handler(matches: &ArgMatches) -> anyhow::Result<()> {
    let name = matches.get_one::<String>("name").unwrap();
    let validator = matches.get_one::<String>("validator").unwrap();
    let http_framework = matches.get_one::<String>("http-framework").unwrap();
    let runtime = matches.get_one::<String>("runtime").unwrap();
    let test_framework = matches.get_one::<String>("test-framework").unwrap();

    if runtime == "bun" && http_framework == "hyper-express" {
        bail!("Hyper Express is not supported for bun");
    }

    let token = get_token()?;

    let data = ramhorns::Content::from(serde_json::json!({
        "app-name": name,
        "validator": validator,
        "http-framework": http_framework,
        "runtime": runtime,
        "test-framework": test_framework,
    }));

    // Process application template files
    let app_template_dir = "templates/application";
    let config_template_dir = "templates/.forklaunch";
    for entry in std::fs::read_dir(app_template_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            let tpl = ramhorns::Template::from_file(&path)?;
            let output_path = std::path::Path::new(name).join(path.file_name().unwrap());
            let rendered = tpl.render(&data);
            std::fs::write(output_path, rendered)?;
        }
    }

    // Process core template files
    let core_dir = format!("{}/core", name);
    std::fs::create_dir_all(&core_dir)?;

    let core_template_dir = "../templates/project/core";
    for entry in std::fs::read_dir(core_template_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            let tpl = ramhorns::Template::from_file(&path)?;
            let output_path = std::path::Path::new(&core_dir).join(path.file_name().unwrap());
            let rendered = tpl.render(&data);
            std::fs::write(output_path, rendered)?;
        }
    }

    // Process package template files if specified
    if let Some(packages) = matches.get_many::<String>("packages") {
        for package in packages {
            let package_dir = format!("{}/{}", name, package);
            std::fs::create_dir_all(&package_dir)?;

            let package_template_dir = format!("../templates/project/{}", package);
            for entry in std::fs::read_dir(package_template_dir)? {
                let entry = entry?;
                let path = entry.path();

                if path.is_file() {
                    let tpl = ramhorns::Template::from_file(&path)?;
                    let output_path =
                        std::path::Path::new(&package_dir).join(path.file_name().unwrap());
                    let rendered = tpl.render(&data);
                    std::fs::write(output_path, rendered)?;
                }
            }
        }
    }

    Ok(())
}
