use std::{io::Write, path::Path, process::Command};

use anyhow::{Result, anyhow};
use dialoguer::Confirm;
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};

use crate::constants::Runtime;

pub(crate) fn clean_application(
    base_path: &Path,
    runtime: &Runtime,
    confirm: bool,
    stdout: &mut StandardStream,
) -> Result<()> {
    let confirm = if confirm {
        true
    } else {
        Confirm::new()
                .default(true)
                .with_prompt("Performing changes will remove existing runtime files (clean:purge). Are you sure you want to continue?")
                .interact()?
    };

    if confirm {
        let command = match runtime {
            Runtime::Node => "pnpm",
            Runtime::Bun => "bun",
        };
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
        writeln!(stdout, "Running {} clean:purge...", command)?;
        stdout.reset()?;
        let _ = Command::new(command)
            .arg("clean:purge")
            .current_dir(base_path)
            .output()?;
        Ok(())
    } else {
        return Err(anyhow!("User cancelled"));
    }
}
