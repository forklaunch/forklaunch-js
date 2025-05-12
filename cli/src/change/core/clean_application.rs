use std::path::Path;

use anyhow::{Result, anyhow};
use dialoguer::Confirm;

use crate::constants::Runtime;

pub(crate) fn clean_application(base_path: &Path, runtime: &Runtime) -> Result<()> {
    let confirm = Confirm::new()
                .with_prompt("Changing the runtime will remove existing runtime files (clean). Are you sure you want to continue?")
                .interact()?;

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
