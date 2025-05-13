use std::path::Path;

use anyhow::{Result, anyhow};
use dialoguer::Confirm;

use crate::constants::Runtime;

pub(crate) fn clean_application(base_path: &Path, runtime: &Runtime, confirm: bool) -> Result<()> {
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
        println!("Running {} clean:purge...", command);
        let _ = std::process::Command::new(command)
            .arg("clean:purge")
            .current_dir(base_path)
            .output()?;
        Ok(())
    } else {
        return Err(anyhow!("User cancelled"));
    }
}
