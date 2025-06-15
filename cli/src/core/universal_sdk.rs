use std::{collections::HashMap, fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use serde_json::from_str;

use crate::{
    constants::{ERROR_FAILED_TO_PARSE_PACKAGE_JSON, ERROR_FAILED_TO_READ_PACKAGE_JSON},
    core::{
        ast::transformations::transform_universal_sdk::{
            transform_universal_sdk_add_sdk, transform_universal_sdk_remove_sdk,
        },
        package_json::project_package_json::ProjectPackageJson,
        rendered_template::RenderedTemplate,
    },
};

pub(crate) fn get_universal_sdk_additional_deps(
    app_name: &String,
    is_billing_enabled: bool,
    is_iam_enabled: bool,
) -> HashMap<String, String> {
    let mut additional_deps = HashMap::new();
    if is_billing_enabled {
        additional_deps.insert(format!("@{app_name}/billing"), "workspace:*".to_string());
    }
    if is_iam_enabled {
        additional_deps.insert(format!("@{app_name}/iam"), "workspace:*".to_string());
    }
    additional_deps
}

pub(crate) fn add_project_to_universal_sdk(
    rendered_templates: &mut Vec<RenderedTemplate>,
    base_path: &Path,
    kebab_case_app_name: &str,
    camel_case_name: &str,
    pascal_case_name: &str,
    kebab_case_name: &str,
) -> Result<()> {
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: transform_universal_sdk_add_sdk(
            base_path,
            &kebab_case_app_name,
            &camel_case_name,
            &pascal_case_name,
            &kebab_case_name,
        )?,
        context: None,
    });

    let mut universal_sdk_project_json = from_str::<ProjectPackageJson>(
        &read_to_string(base_path.join("universal-sdk").join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    universal_sdk_project_json
        .dev_dependencies
        .as_mut()
        .unwrap()
        .additional_deps
        .insert(
            format!("@{}/{}", &kebab_case_app_name, &kebab_case_name),
            "workspace:*".to_string(),
        );

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("package.json"),
        content: serde_json::to_string(&universal_sdk_project_json)?,
        context: None,
    });

    Ok(())
}

pub(crate) fn remove_project_from_universal_sdk(
    rendered_templates: &mut Vec<RenderedTemplate>,
    base_path: &Path,
    kebab_case_app_name: &str,
    camel_case_name: &str,
    kebab_case_name: &str,
) -> Result<()> {
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: transform_universal_sdk_remove_sdk(
            base_path,
            &kebab_case_app_name,
            &camel_case_name,
            &kebab_case_name,
        )?,
        context: None,
    });

    let mut universal_sdk_project_json = from_str::<ProjectPackageJson>(
        &read_to_string(base_path.join("universal-sdk").join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    universal_sdk_project_json
        .dev_dependencies
        .as_mut()
        .unwrap()
        .additional_deps
        .remove(&format!("@{}/{}", &kebab_case_app_name, &kebab_case_name));

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("package.json"),
        content: serde_json::to_string(&universal_sdk_project_json)?,
        context: None,
    });

    Ok(())
}
