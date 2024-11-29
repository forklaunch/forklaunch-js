use std::{collections::HashMap, env::current_exe, path::Path};

use anyhow::{bail, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use ramhorns::{Content, Ramhorns};
use serde::{Deserialize, Serialize};
use std::fs::write;

use crate::{config_struct, utils::get_token, LATEST_CLI_VERSION};

use super::{
    forklaunch_command, setup_forklaunch_config, setup_symlinks, setup_with_template, CliCommand,
    PathIO,
};

config_struct!(
    #[derive(Debug, Serialize, Content)]
    struct ApplicationConfigData {}
);

#[derive(Debug)]
pub(super) struct ApplicationCommand {}

impl ApplicationCommand {
    pub(super) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ApplicationCommand {
    // TODO: Add support for biome
    fn command(&self) -> Command {
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
                .action(ArgAction::Append),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
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

        // Include basic token checks (expiration, permissions mapping) in this method
        let _token = get_token()?;

        // Inline specific perms checks here. Make remote calls to receive templates for specific packages if needed here (premium only).

        let mut additional_projects = packages.map(|p| p.to_string()).collect::<Vec<String>>();
        additional_projects.push("core".to_string());

        let mut project_peer_topology = HashMap::new();
        project_peer_topology.insert(name.to_string(), additional_projects.clone());

        let data = ApplicationConfigData {
            cli_version: LATEST_CLI_VERSION.to_string(),
            app_name: name.to_string(),
            validator: validator.to_string(),
            http_framework: http_framework.to_string(),
            runtime: runtime.to_string(),
            test_framework: test_framework.to_string(),
            generated_projects: additional_projects.clone(),
            project_peer_topology,

            is_express: http_framework == "express",
            is_hyper_express: http_framework == "hyper-express",
            is_zod: validator == "zod",
            is_typebox: validator == "typebox",
            is_bun: runtime == "bun",
            is_node: runtime == "node",
            is_vitest: test_framework == "vitest",
            is_jest: test_framework == "jest",
        };

        setup_forklaunch_config(&Path::new(name).to_string_lossy().to_string(), &data)?;

        // TODO: support different path delimiters
        let mut template_dirs = vec![PathIO {
            input_path: "templates/application".to_string(),
            output_path: "".to_string(),
        }];

        let additional_projects_dirs = additional_projects.clone().into_iter().map(|path| PathIO {
            input_path: format!("templates/project/{}", path),
            output_path: path,
        });
        template_dirs.extend(additional_projects_dirs.clone());

        let mut template = Ramhorns::lazy(current_exe()?.parent().unwrap())?;

        for template_dir in template_dirs {
            setup_with_template(
                Some(name),
                &template_dir,
                &mut template,
                &data,
                &ignore_files
                    .iter()
                    .map(|ignore_file| ignore_file.to_string())
                    .collect::<Vec<String>>(),
            )?;
        }

        additional_projects_dirs
            .into_iter()
            .try_for_each(|template_dir| {
                setup_symlinks(
                    Some(name),
                    &Path::new(name)
                        .join(&template_dir.output_path)
                        .to_string_lossy()
                        .to_string(),
                    &data,
                )
            })?;

        // TODO: create a function for this
        if generate_pnpm_workspace {
            let pnpm_workspace_path = Path::new(name).join("pnpm-workspace.yaml");
            if !pnpm_workspace_path.exists() {
                write(
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
}
