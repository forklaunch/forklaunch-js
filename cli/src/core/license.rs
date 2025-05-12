use std::path::Path;

use anyhow::Result;
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
    app_path: &Path,
    data: &ApplicationManifestData,
) -> Result<Option<RenderedTemplate>> {
    let license_file = match data.license.as_str() {
        "APGL-3.0" => Some("agpl-3.0"),
        "GPL-3.0" => Some("gpl-3.0"),
        "LGPL-3.0" => Some("lgpl-3.0"),
        "MPL-2.0" => Some("mpl-2.0"),
        "Apache-2.0" => Some("apache-2.0"),
        "MIT" => Some("mit"),
        "Boost-1.0" => Some("boost-1.0"),
        "Unlicense" => Some("unlicense"),
        "UNLICENSED" => None,
        _ => None,
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
        path: app_path.join("LICENSE"),
        content: license_template.render(data),
        context: None,
    }))
}
