use std::path::Path;

use anyhow::{Context, Result};

use crate::{
    constants::error_failed_to_read_file, core::rendered_template::RenderedTemplatesCache,
};

pub(crate) fn transform_core_registrations_ts_http_framework(
    rendered_templates_cache: &RenderedTemplatesCache,
    http_framework_name: &str,
    existing_http_framework_name: &str,
    base_path: &Path,
) -> Result<String> {
    let core_registration_http_framework_path = base_path.join("core").join("registrations.ts");
    let template = rendered_templates_cache
        .get(&core_registration_http_framework_path)?
        .context(error_failed_to_read_file(
            &core_registration_http_framework_path,
        ))?;
    let core_registration_http_framework_text = template.content;

    Ok(core_registration_http_framework_text.replace(
        format!("@forklaunch/{}", existing_http_framework_name).as_str(),
        format!("@forklaunch/{}", http_framework_name).as_str(),
    ))
}

pub(crate) fn transform_core_registrations_ts_validator(
    rendered_templates_cache: &RenderedTemplatesCache,
    validator_name: &str,
    existing_validator_name: &str,
    base_path: &Path,
) -> Result<String> {
    let core_registration_validator_path = base_path.join("core").join("registrations.ts");
    let template = rendered_templates_cache
        .get(&core_registration_validator_path)?
        .context(error_failed_to_read_file(&core_registration_validator_path))?;
    let core_registration_validator_text = template.content;

    Ok(core_registration_validator_text.replace(
        format!("@forklaunch/validator/{}", existing_validator_name).as_str(),
        format!("@forklaunch/validator/{}", validator_name).as_str(),
    ))
}
