use std::{collections::HashMap, fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use convert_case::{Case, Casing};
use serde_json::from_str;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};


use crate::{
    constants::{ERROR_FAILED_TO_PARSE_PACKAGE_JSON, ERROR_FAILED_TO_READ_PACKAGE_JSON},
    core::{
        ast::{
            injections::inject_into_universal_sdk::{UniversalSdkSpecialCase, inject_into_universal_sdk},
            deletions::delete_from_universal_sdk::delete_from_universal_sdk,
            transformations::transform_universal_sdk::{
                transform_universal_sdk_change_sdk,
                transform_universal_sdk_remove_sdk,
                transform_universal_sdk_add_sdk_with_special_case,
            }, 
            parse_ast_program::parse_ast_program,
            validation::validate_remove_from_universal_sdk,
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
    special_case: Option<UniversalSdkSpecialCase>,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);
    let kebab_case_name = &name.to_case(Case::Kebab);

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: transform_universal_sdk_add_sdk_with_special_case(
            base_path,
            app_name,
            name,
            special_case,
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

pub(crate) fn remove_project_vec_from_universal_sdk(
    rendered_templates: &mut Vec<RenderedTemplate>,
    base_path: &Path,
    app_name: &str,
    projects_to_remove: &Vec<String>,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());
    for project in projects_to_remove {
        delete_from_universal_sdk(&allocator, &mut app_program_ast, app_name, project)?;
    }
    let universal_sdk_content = Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code;
    println!("universal_sdk:197 universal_sdk_content: {:?}", universal_sdk_content);
    
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: universal_sdk_content.clone(),
        context: None,
    });

    let mut universal_sdk_project_json = from_str::<ProjectPackageJson>(
        &read_to_string(base_path.join("universal-sdk").join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;

    for project in projects_to_remove {
        let kebab_case_project = &project.to_case(Case::Kebab);
        println!("universal_sdk:212 kebab_case_project: {:?}", kebab_case_project);
        universal_sdk_project_json
            .dev_dependencies
            .as_mut()
            .unwrap()
            .additional_deps
            .remove(&format!("@{}/{}", &kebab_case_app_name, &kebab_case_project));
    }

    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("package.json"),
        content: serde_json::to_string_pretty(&universal_sdk_project_json)?,
        context: None,
    });
    
    println!("universal_sdk:226 validating universal SDK changes");
    validate_remove_from_universal_sdk(
            &app_name,
            &universal_sdk_content,
            &universal_sdk_project_json,
            &projects_to_remove,
        )?;
    println!("universal_sdk:234 Successfully validated universal SDK changes for {} project(s)", projects_to_remove.len());
    Ok(())
}

pub(crate) fn add_project_vec_to_universal_sdk(
    rendered_templates: &mut Vec<RenderedTemplate>,
    base_path: &Path,
    app_name: &str,
    projects_to_add: &Vec<String>,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);
    let allocator = Allocator::default();
    let app_program_text = read_to_string(base_path.join("universal-sdk").join("universalSdk.ts"))?;
    let mut app_program_ast = parse_ast_program(&allocator, &app_program_text, SourceType::ts());
    for project in projects_to_add {
        let kebab_case_project = &project.to_case(Case::Kebab);
        inject_into_universal_sdk(&allocator, &mut app_program_ast, app_name, kebab_case_project, &app_program_text, None)?;
    }
    let universal_sdk_content = Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&app_program_ast)
        .code;
    println!("universal_sdk:259 universal_sdk_content: {:?}", universal_sdk_content);
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("universalSdk.ts"),
        content: universal_sdk_content.clone(),
        context: None,
    });
    let mut universal_sdk_project_json = from_str::<ProjectPackageJson>(
        &read_to_string(base_path.join("universal-sdk").join("package.json"))
            .with_context(|| ERROR_FAILED_TO_READ_PACKAGE_JSON)?,
    )
    .with_context(|| ERROR_FAILED_TO_PARSE_PACKAGE_JSON)?;
    for project in projects_to_add {
        let kebab_case_project = &project.to_case(Case::Kebab);
        universal_sdk_project_json
        .dev_dependencies
        .as_mut()
        .unwrap()
        .additional_deps
        .insert(
            format!("@{}/{}", &kebab_case_app_name, &kebab_case_project),
            "workspace:*".to_string(),
        );
    }
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("universal-sdk").join("package.json"),
        content: serde_json::to_string_pretty(&universal_sdk_project_json)?,
        context: None,
    });
    // TODO: validate universal SDK changes
    Ok(())
}