use std::{fs::create_dir_all, io::Write};

use anyhow::{Context, Result};
use clap::{Arg, ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::{
        command::command,
        openapi_export::export_all_services,
    },
};

#[derive(Debug)]
pub(crate) struct ExportCommand;

impl ExportCommand {
    pub(crate) fn new() -> Self {
        Self {}
    }
}

impl CliCommand for ExportCommand {
    fn command(&self) -> Command {
        command("export", "Export OpenAPI specifications from services")
            .arg(
                Arg::new("base_path")
                    .long("path")
                    .short('p')
                    .help("Path to application root (optional)"),
            )
            .arg(
                Arg::new("output")
                    .long("output")
                    .short('o')
                    .default_value(".forklaunch/openapi")
                    .help("Output directory for OpenAPI specs"),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        // Upfront validation
        let (app_root, manifest) = crate::core::validate::require_manifest(matches)?;

        let output_dir = matches.get_one::<String>("output").unwrap();
        let output_path = app_root.join(output_dir);

        create_dir_all(&output_path)
            .with_context(|| format!("Failed to create output directory: {:?}", output_path))?;

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "Exporting OpenAPI specifications...")?;
        stdout.reset()?;
        writeln!(stdout)?;

        let result = export_all_services(&app_root, &manifest, &output_path);

        writeln!(stdout)?;

        match result {
            Ok(exported_services) => {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)).set_bold(true))?;
                writeln!(
                    stdout,
                    "[OK] Successfully exported {} OpenAPI specification(s)",
                    exported_services.len()
                )?;
                stdout.reset()?;
                writeln!(stdout, "  Output: {}", output_path.display())?;

                for service_name in &exported_services {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "  - {}", service_name)?;
                    stdout.reset()?;
                }
            }
            Err(e) => {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                writeln!(stdout, "[ERROR] Failed to export OpenAPI specifications")?;
                stdout.reset()?;
                return Err(e);
            }
        }

        Ok(())
    }
}
