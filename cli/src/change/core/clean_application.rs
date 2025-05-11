use std::path::Path;

use anyhow::{Result, anyhow};
use dialoguer::Confirm;

use crate::{constants::Runtime, core::manifest::application::ApplicationManifestData};

pub(crate) fn clean_application(
    base_path: &Path,
    manifest_data: &ApplicationManifestData,
) -> Result<()> {
    let confirm = Confirm::new()
                .with_prompt("Changing the runtime will remove existing runtime files (clean). Are you sure you want to continue?")
                .interact()?;

    if confirm {
        let command = match manifest_data.runtime.parse()? {
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
