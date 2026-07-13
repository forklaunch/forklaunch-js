use std::io::Write;

use anyhow::Result;
use clap::{Arg, ArgAction, ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::{
        command::command,
        validate::{require_integration, require_manifest, resolve_auth},
    },
};

use super::{
    resource_resolver::{fetch_resource_detail, require_jwt_mode, resolve},
    types::ResourceDetailResponse,
};

#[derive(Debug)]
pub(super) struct StatusCommand;

impl StatusCommand {
    pub(super) fn new() -> Self {
        Self
    }
}

impl CliCommand for StatusCommand {
    fn command(&self) -> Command {
        command(
            "status",
            "Show the status of a provisioned database, cache, or queue resource",
        )
        .arg(
            Arg::new("resource")
                .help("Resource identifier: <project-name>:<resource-type> (e.g. billing-service:database)")
                .required(true),
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path"),
        )
        .arg(
            Arg::new("environment")
                .short('e')
                .long("environment")
                .required(true)
                .help("Environment to inspect (for example: dev, staging, production)"),
        )
        .arg(
            Arg::new("resource_id")
                .long("resource-id")
                .help("Skip name resolution and address a resource by its platform id directly"),
        )
        .arg(
            Arg::new("config")
                .long("config")
                .help("Show only the resource's configuration (manifestConfig), not the full status view")
                .action(ArgAction::SetTrue),
        )
        .arg(
            Arg::new("json")
                .long("json")
                .help("Output raw JSON instead of formatted terminal output")
                .action(ArgAction::SetTrue),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let auth_mode = resolve_auth()?;
        require_jwt_mode(&auth_mode)?;
        let (_app_root, manifest) = require_manifest(matches)?;
        let application_id = require_integration(&manifest)?;
        let environment = matches
            .get_one::<String>("environment")
            .expect("--environment is required")
            .to_string();
        let resource_arg = matches
            .get_one::<String>("resource")
            .expect("<resource> is required");
        let resource_id_override = matches.get_one::<String>("resource_id").map(String::as_str);
        let config_only = matches.get_flag("config");
        let json_output = matches.get_flag("json");

        let resolved = resolve(
            &auth_mode,
            &manifest,
            &application_id,
            &environment,
            resource_arg,
            resource_id_override,
        )?;

        let detail = fetch_resource_detail(&auth_mode, &resolved.id)?;

        if json_output {
            if config_only {
                println!("{}", serde_json::to_string_pretty(&detail.manifest_config)?);
            } else {
                println!("{}", serde_json::to_string_pretty(&detail)?);
            }
            return Ok(());
        }

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        if config_only {
            print_config(&mut stdout, &detail)?;
        } else {
            print_status(&mut stdout, &detail)?;
        }

        Ok(())
    }
}

fn print_status(stdout: &mut StandardStream, detail: &ResourceDetailResponse) -> Result<()> {
    writeln!(stdout)?;
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
    writeln!(stdout, "{} ({})", detail.name, detail.r#type)?;
    stdout.reset()?;
    writeln!(stdout)?;

    writeln!(stdout, "  id:           {}", detail.id)?;
    writeln!(stdout, "  status:       {}", detail.status)?;
    writeln!(stdout, "  provider:     {}", detail.provider)?;
    if let Some(env) = &detail.environment {
        writeln!(stdout, "  environment:  {}", env)?;
    }
    if let Some(region) = &detail.region {
        writeln!(stdout, "  region:       {}", region)?;
    }
    if let Some(endpoint) = &detail.endpoint {
        writeln!(stdout, "  endpoint:     {}", endpoint)?;
    }
    writeln!(stdout, "  updated:      {}", detail.updated_at)?;
    writeln!(stdout)?;

    Ok(())
}

fn print_config(stdout: &mut StandardStream, detail: &ResourceDetailResponse) -> Result<()> {
    writeln!(stdout)?;
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
    writeln!(stdout, "{} — configuration", detail.name)?;
    stdout.reset()?;
    writeln!(stdout)?;

    let cfg = &detail.manifest_config;
    macro_rules! print_field {
        ($label:expr, $value:expr) => {
            if let Some(v) = &$value {
                writeln!(stdout, "  {:<20} {:?}", $label, v)?;
            }
        };
    }
    print_field!("instance_class:", cfg.instance_class);
    print_field!("engine:", cfg.engine);
    print_field!("allocated_storage:", cfg.allocated_storage);
    print_field!("num_cache_nodes:", cfg.num_cache_nodes);
    print_field!("number_of_broker_nodes:", cfg.number_of_broker_nodes);
    print_field!("ebs_storage_size:", cfg.ebs_storage_size);
    print_field!("visibility_timeout:", cfg.visibility_timeout);
    print_field!("message_retention_seconds:", cfg.message_retention_seconds);
    print_field!("port:", cfg.port);
    print_field!("multi_az:", cfg.multi_az);
    print_field!("node_type:", cfg.node_type);
    print_field!("broker_node_type:", cfg.broker_node_type);
    print_field!("kafka_version:", cfg.kafka_version);
    print_field!("queue_type:", cfg.queue_type);
    print_field!("encryption:", cfg.encryption);
    writeln!(stdout)?;

    Ok(())
}
