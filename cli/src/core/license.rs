use std::path::Path;

use anyhow::Result;
use ramhorns::Template;

use super::rendered_template::{RenderedTemplate, TEMPLATES_DIR};
use crate::{constants::License, core::manifest::application::ApplicationManifestData};

pub(crate) fn generate_license(
    app_path: &Path,
    data: &ApplicationManifestData,
) -> Result<Option<RenderedTemplate>> {
    let license_file = match data.license.parse::<License>()?.metadata().exclusive_files {
        Some(files) => files.first().unwrap(),
        None => return Ok(None),
    };

    let license_template = Template::new(
        TEMPLATES_DIR
            .get_file(Path::new("licenses").join(license_file))
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
