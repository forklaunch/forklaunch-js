use std::{env::current_exe, fs::write, path::Path};

use crate::init::application::ApplicationConfigData;
use anyhow::Result;
use log::warn;
use ramhorns::Ramhorns;

pub(crate) fn setup_license(app_path: &str, data: &ApplicationConfigData) -> Result<()> {
    let license_file = match data.license.as_str() {
        "AGPL-3.0" => Some("agpl-3.0"),
        "Apache-2.0" => Some("apache-2.0"),
        "MIT" => Some("mit"),
        "BSL-1.0" => Some("boost-1.0"),
        "GPL-3.0" => Some("gpl-3.0"),
        "LGPL-3.0" => Some("lgpl-3.0"),
        "MPL-2.0" => Some("mpl-2.0"),
        "Unlicense" => Some("unlicense"),
        "UNLICENSED" => None,
        _ => {
            warn!("No supported license found. Skipping license generation.");
            None
        }
    };

    if license_file.is_none() {
        return Ok(());
    }

    let mut template: Ramhorns = Ramhorns::lazy(current_exe()?.parent().unwrap())?;

    let license_template = template.from_file(
        Path::new("templates")
            .join("licenses")
            .join(license_file.unwrap())
            .to_str()
            .unwrap(),
    )?;
    write(
        Path::new(app_path).join("LICENSE"),
        license_template.render(data),
    )?;

    Ok(())
}
