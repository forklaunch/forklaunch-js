use std::{collections::HashMap, fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use convert_case::{Case, Casing};
use serde_json::from_str;
use regex::Regex;

use crate::{
    constants::{ERROR_FAILED_TO_PARSE_PACKAGE_JSON, ERROR_FAILED_TO_READ_PACKAGE_JSON},
    core::{
        ast::transformations::transform_universal_sdk::{
            transform_universal_sdk_add_sdk, transform_universal_sdk_change_sdk,
            transform_universal_sdk_remove_sdk,
        },
        package_json::project_package_json::ProjectPackageJson,
        rendered_template::{RenderedTemplate, RenderedTemplatesCache},
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
    app_name: &str,
    name: &str,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);
    let kebab_case_name = &name.to_case(Case::Kebab);

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: transform_universal_sdk_add_sdk(base_path, app_name, name)?,
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
        content: serde_json::to_string_pretty(&universal_sdk_project_json)?,
        context: None,
    });

    Ok(())
}

pub(crate) fn remove_project_from_universal_sdk(
    rendered_templates: &mut Vec<RenderedTemplate>,
    base_path: &Path,
    app_name: &str,
    name: &str,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);
    let kebab_case_name = &name.to_case(Case::Kebab);

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: transform_universal_sdk_remove_sdk(base_path, app_name, name)?,
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
        content: serde_json::to_string_pretty(&universal_sdk_project_json)?,
        context: None,
    });

    Ok(())
}

pub(crate) fn change_project_in_universal_sdk(
    rendered_templates: &mut RenderedTemplatesCache,
    base_path: &Path,
    app_name: &str,
    existing_name: &str,
    name: &str,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);
    let kebab_case_existing_name = &existing_name.to_case(Case::Kebab);
    let kebab_case_name = &name.to_case(Case::Kebab);

    rendered_templates.insert(
        base_path
            .join("universal-sdk")
            .join("universalSdk.ts")
            .to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("universal-sdk").join("universalSdk.ts"),
            content: transform_universal_sdk_change_sdk(base_path, app_name, existing_name, name)?,
            context: None,
        },
    );

    let mut universal_sdk_project_json = from_str::<ProjectPackageJson>(
        &read_to_string(base_path.join("universal-sdk").join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    let additional_deps = &mut universal_sdk_project_json
        .dev_dependencies
        .as_mut()
        .unwrap()
        .additional_deps;

    additional_deps.remove(&format!(
        "@{}/{}",
        &kebab_case_app_name, &kebab_case_existing_name
    ));
    additional_deps.insert(
        format!("@{}/{}", &kebab_case_app_name, &kebab_case_name),
        "workspace:*".to_string(),
    );

    rendered_templates.insert(
        base_path
            .join("universal-sdk")
            .join("package.json")
            .to_string_lossy(),
        RenderedTemplate {
            path: base_path.join("universal-sdk").join("package.json"),
            content: serde_json::to_string_pretty(&universal_sdk_project_json)?,
            context: None,
        },
    );

    Ok(())
}

pub(crate) fn validate_universal_sdk_changes(
    base_path: &Path,
    app_name: &str,
    projects_to_remove: &Vec<String>,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);

    let universal_sdk_project_json = from_str::<ProjectPackageJson>(
        &read_to_string(base_path.join("universal-sdk").join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    let current_deps = &universal_sdk_project_json.dev_dependencies.as_ref().unwrap().additional_deps;
    println!("universal_sdk:185 current_deps: {:?}", current_deps);

    for project in projects_to_remove {
        let kebab_case_project = &project.to_case(Case::Kebab);
        let dep_key = format!("@{}/{}", &kebab_case_app_name, &kebab_case_project);
        println!("universal_sdk:190 dep_key: {:?}", dep_key);
        if current_deps.contains_key(&dep_key) {
            return Err(anyhow::anyhow!("Project {} is still in universal-sdk/package.json", project));
        }
    }

    let universal_sdk_content = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))
        .with_context(|| "Failed to read universal-sdk/universalSdk.ts")?;
    let failed_projects = vec![];
    for project in projects_to_remove {
        let kebab_case_project = &project.to_case(Case::Kebab);
        let escaped = regex::escape(kebab_case_project);
        println!("universal_sdk:203 escaped: {:?}", escaped);
        let pattern = format!(r#"(?m)^\s*(import|export)\b.*{escaped}.*"#);
        let re = Regex::new(&pattern).unwrap();
        filtered_lines = universal_sdk_content.lines().filter(|line| re.is_match(line)).map(|line| line.to_string()).collect();
        if filtered_lines.is_empty() {
            println!("universal_sdk:208 No imports/exports found for project {}", project);
        } else {
            println!("universal_sdk:210 Imports/exports found for project {}", project);
            failed_projects.push(project);
        }
    }
    if failed_projects.is_empty() {
        println!("universal_sdk:216 Successfully removed projects from universal-sdk/universalSdk.ts");
    } else {
        println!("universal_sdk:218 Failed to remove projects from universal-sdk/universalSdk.ts: {:?}", failed_projects);
        return Err(anyhow::anyhow!("Failed to remove projects from universal-sdk/universalSdk.ts: {:?}", failed_projects));
    }
    Ok(())
}
