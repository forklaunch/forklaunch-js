use std::path::Path;

use anyhow::Result;
use log::warn;
use ramhorns::Template;

use super::rendered_template::{RenderedTemplate, TEMPLATES_DIR};
use crate::{constants::License, core::manifest::application::ApplicationManifestData};

pub(crate) fn match_license(license: License) -> Result<String> {
    match license {
        License::Apgl => Ok("AGPL-3.0".to_string()),
        License::Gpl => Ok("GPL-3.0".to_string()),
        License::Lgpl => Ok("LGPL-3.0".to_string()),
        License::Mozilla => Ok("MPL-2.0".to_string()),
        License::Apache => Ok("Apache-2.0".to_string()),
        License::Mit => Ok("MIT".to_string()),
        License::Boost => Ok("BSL-1.0".to_string()),
        License::Unlicense => Ok("Unlicense".to_string()),
        License::None => Ok("UNLICENSED".to_string()),
    }
}

pub(crate) fn generate_license(
    app_path: &str,
    data: &ApplicationManifestData,
) -> Result<Option<RenderedTemplate>> {
    let license_file = match data.license.parse()? {
        License::Apgl => Some("agpl-3.0"),
        License::Apache => Some("apache-2.0"),
        License::Mit => Some("mit"),
        License::Boost => Some("boost-1.0"),
        License::Gpl => Some("gpl-3.0"),
        License::Lgpl => Some("lgpl-3.0"),
        License::Mozilla => Some("mpl-2.0"),
        License::Unlicense => Some("unlicense"),
        License::None => None,
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
