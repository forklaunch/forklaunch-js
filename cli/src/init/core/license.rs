use std::path::Path;

use crate::init::{application::ApplicationManifestData, TEMPLATES_DIR};
use anyhow::{bail, Result};
use log::warn;
use ramhorns::Template;

use super::rendered_template::RenderedTemplate;

pub(crate) fn match_license(license: &str) -> Result<String> {
    match license {
        "apgl" => Ok("AGPL-3.0".to_string()),
        "gpl" => Ok("GPL-3.0".to_string()),
        "lgpl" => Ok("LGPL-3.0".to_string()),
        "mozilla" => Ok("MPL-2.0".to_string()),
        "apache" => Ok("Apache-2.0".to_string()),
        "mit" => Ok("MIT".to_string()),
        "boost" => Ok("BSL-1.0".to_string()),
        "unlicense" => Ok("Unlicense".to_string()),
        "none" => Ok("UNLICENSED".to_string()),
        _ => bail!("Invalid license"),
    }
}

pub(crate) fn generate_license(
    app_path: &str,
    data: &ApplicationManifestData,
) -> Result<Option<RenderedTemplate>> {
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
            warn!("No supported license found. Skipping license generation");
            None
        }
    };

    if license_file.is_none() {
        return Ok(None);
    }

    let license_template = Template::new(
        TEMPLATES_DIR
            .get_file(Path::new("licenses").join(license_file.unwrap()))
            .unwrap()
            .contents_utf8()
            .unwrap(),
    )?;

    Ok(Some(RenderedTemplate {
        path: Path::new(app_path).join("LICENSE"),
        content: license_template.render(data),
        context: None,
    }))
}
