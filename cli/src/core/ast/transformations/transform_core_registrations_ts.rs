use std::{fs::read_to_string, path::Path};

use anyhow::Result;

pub(crate) fn transform_core_registrations_ts_http_framework(
    http_framework_name: &str,
    existing_http_framework_name: &str,
    base_path: &Path,
    core_registration_http_framework_text: Option<String>,
) -> Result<String> {
    let core_registration_http_framework_path = base_path.join("core").join("registrations.ts");
    let core_registration_http_framework_text = if let Some(core_registration_http_framework_text) =
        core_registration_http_framework_text
    {
        core_registration_http_framework_text
    } else {
        read_to_string(&core_registration_http_framework_path)?
    };

    Ok(core_registration_http_framework_text.replace(
        format!("@forklaunch/{}", existing_http_framework_name).as_str(),
        format!("@forklaunch/{}", http_framework_name).as_str(),
    ))
}

pub(crate) fn transform_core_registrations_ts_validator(
    validator_name: &str,
    existing_validator_name: &str,
    base_path: &Path,
    core_registration_validator_text: Option<String>,
) -> Result<String> {
    let core_registration_validator_path = base_path.join("core").join("registrations.ts");
    let core_registration_validator_text =
        if let Some(core_registration_validator_text) = core_registration_validator_text {
            core_registration_validator_text
        } else {
            read_to_string(&core_registration_validator_path)?
        };

    Ok(core_registration_validator_text.replace(
        format!("@forklaunch/validator/{}", existing_validator_name).as_str(),
        format!("@forklaunch/validator/{}", validator_name).as_str(),
    ))
}
