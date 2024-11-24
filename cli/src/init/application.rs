use std::{fs, path::Path};

use anyhow::bail;
use clap::{Arg, ArgMatches, Command};
use ramhorns::{Content, Ramhorns};

use crate::{
    init::library::{setup_gitignore, setup_symlinks, setup_tsconfig},
    utils::get_token,
    LATEST_CLI_VERSION,
};

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

pub(crate) struct PathIO {
    input_path: String,
    output_path: String,
    project: bool,
}

#[derive(Debug, Content)]
pub(crate) struct ConfigData {
    pub(super) latest_cli_version: String,
    pub(super) app_name: String,
    pub(super) validator: String,
    pub(super) http_framework: String,
    pub(super) runtime: String,
    pub(super) test_framework: String,
    pub(super) token: String,
    pub(super) generated_projects: String,
}

pub(crate) fn apply_templates(
    name: &String,
    template_dir: &PathIO,
    template: &mut Ramhorns,
    data: &ConfigData,
    ignore_files: &Vec<String>,
) -> anyhow::Result<()> {
    println!("applying templates for {}", template_dir.input_path);
    for entry in std::fs::read_dir(get_template_path(&template_dir)?)? {
        let entry = entry?;
        let path = entry.path();

        let output_path = std::path::Path::new(name.as_str())
            .join(&template_dir.output_path)
            .join(path.file_name().unwrap());
        if !output_path.exists() {
            std::fs::create_dir_all(output_path.parent().unwrap())?;
        }

        println!(
            "{} -> {}",
            path.to_str().unwrap(),
            output_path.to_str().unwrap()
        );

        if path.is_file() {
            let tpl = template.from_file(&path.to_str().unwrap())?;
            let rendered = tpl.render(&data);
            if !output_path.exists()
                && !ignore_files
                    .iter()
                    .any(|ignore_file| output_path.to_str().unwrap().contains(ignore_file))
            {
                std::fs::write(output_path, rendered)?;
            }
        } else if path.is_dir() {
            apply_templates(
                name,
                &PathIO {
                    input_path: std::path::Path::new(&template_dir.input_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                    output_path: std::path::Path::new(&template_dir.output_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                    project: false,
                },
                template,
                data,
                ignore_files,
            )?;
        }
    }

    if template_dir.project {
        setup_symlinks(base_path, current_path, config_data)?;
        setup_gitignore()?;
        setup_tsconfig()?;
    }

    Ok(())
}

pub(crate) fn get_template_path(path: &PathIO) -> anyhow::Result<String> {
    Ok(std::env::current_exe()?
        .parent()
        .unwrap()
        .join(&path.input_path)
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

    let mut ignore_files = vec!["pnpm-workspace.yaml", "pnpm-lock.yaml"];

    // TODO: maybe abstract this into a function
    let all_test_framework_config_files = vec!["vitest.config.ts", "jest.config.ts"];
    let test_framework_config_file = match test_framework.as_str() {
        "vitest" => "vitest.config.ts",
        "jest" => "jest.config.ts",
        _ => bail!("Invalid test framework: {}", test_framework),
    };
    ignore_files.extend(
        all_test_framework_config_files
            .into_iter()
            .filter(|config| config != &test_framework_config_file),
    );

    let generate_pnpm_workspace = runtime != "bun";

    if runtime == "bun" && http_framework == "hyper-express" {
        bail!("Hyper Express is not supported for bun");
    }

    let token = get_token()?;

    let additional_projects = packages.map(|p| p.to_string()).collect::<Vec<String>>();

    let data = ConfigData {
        latest_cli_version: LATEST_CLI_VERSION.to_string(),
        app_name: name.to_string(),
        validator: validator.to_string(),
        http_framework: http_framework.to_string(),
        runtime: runtime.to_string(),
        test_framework: test_framework.to_string(),
        token: token,
        generated_projects: {
            let mut projects = vec!["core".to_string()];
            projects.extend(additional_projects.clone());
            format!("[{}]", projects.join(","))
        },
    };

    // TODO: support different path delimiters
    let mut template_dirs = vec![
        PathIO {
            input_path: "templates/application".to_string(),
            output_path: "".to_string(),
            project: false,
        },
        PathIO {
            input_path: "templates/.forklaunch".to_string(),
            output_path: ".forklaunch".to_string(),
            project: false,
        },
        PathIO {
            input_path: "templates/project/core".to_string(),
            output_path: "core".to_string(),
            project: true,
        },
    ];

    template_dirs.extend(additional_projects.clone().into_iter().map(|path| PathIO {
        input_path: format!("templates/project/{}", path),
        output_path: path,
        project: true,
    }));

    let mut template = Ramhorns::lazy(std::env::current_exe()?.parent().unwrap())?;

    for template_dir in template_dirs {
        apply_templates(
            name,
            &template_dir,
            &mut template,
            &data,
            &ignore_files
                .iter()
                .map(|ignore_file| ignore_file.to_string())
                .collect::<Vec<String>>(),
        )?;
    }

    // TODO: Generate pnpm workspaces
    if generate_pnpm_workspace {
        let pnpm_workspace_path = Path::new(name).join("pnpm-workspace.yaml");
        if !pnpm_workspace_path.exists() {
            std::fs::write(
                pnpm_workspace_path,
                if additional_projects.is_empty() {
                    "packages:\n  - \"core\"".to_string()
                } else {
                    format!(
                        "packages:\n  - \"core\"\n  - \"{}\"",
                        additional_projects.join("\n  - ")
                    )
                },
            )?;
        }
    }

    Ok(())
}
