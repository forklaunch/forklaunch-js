use std::{collections::HashMap, fs::read_to_string, path::Path};

use anyhow::{Context, Result};
use convert_case::{Case, Casing};
use serde_json::from_str;
use oxc_allocator::Allocator;
use oxc_ast_visit::{Visit, walk::{walk_statement, walk_program}};
use oxc_ast::ast::{SourceType, Statement, Expression, TSType, Declaration, TSSignature, BindingPatternKind};
use oxc_codegen::{Codegen, CodegenOptions};


use crate::{
    constants::{ERROR_FAILED_TO_PARSE_PACKAGE_JSON, ERROR_FAILED_TO_READ_PACKAGE_JSON},
    core::{
        ast::{
            deletions::delete_from_universal_sdk::delete_from_universal_sdk,
            transformations::transform_universal_sdk::{
                transform_universal_sdk_add_sdk, transform_universal_sdk_change_sdk,
                transform_universal_sdk_remove_sdk,
            }, 
            parse_ast_program::parse_ast_program
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
    // TODO: Automate validation later
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

struct ProjectReferenceValidator<'a> {
    projects_to_remove: &'a Vec<String>,
    matches: HashMap<String, Vec<String>>,
}

impl<'a, 'ast> ProjectReferenceValidator<'a> {
    fn check_str(&mut self, s: &str) {
        for project in self.projects_to_remove {
            let kebab_case_project = &project.to_case(Case::Kebab);
            println!("universal_sdk:247 kebab_case_project: {:?}", kebab_case_project);
            if s.contains(kebab_case_project) {
                self.matches.entry(kebab_case_project.clone()).or_default().push(s.to_string());
            }
        }
    }

    fn check_expr(&mut self, expr: &Expression) {
        match expr {
            Expression::Identifier(ident) => self.check_str(&ident.name.to_string()),
            Expression::CallExpression(call_expr) => {
                self.check_expr(&call_expr.callee);
                if let Some(type_arguments) = &call_expr.type_arguments {
                    for param in &type_arguments.params {
                        self.check_type(&param);
                    }
                }
                for arg in &call_expr.arguments {
                    self.check_expr(&arg.expression);
                }
            }
            Expression::ObjectExpression(obj) => {
                for prop in &obj.properties {
                    match prop {
                        ObjectPropertyKind::ObjectProperty(prop) => {
                            self.check_type(&prop.key);
                            self.check_expr(&prop.value);
                        }
                        _ => {}
                    }
                }
            }
            Expression::ParenthesizedExpression(parenthesized_expr) => {
                self.check_expr(&parenthesized_expr.expression);
            }
            Expression::ArrowFunctionExpression(arrow) => {
                for param in &arrow.params.items {
                    match &param.pattern.kind {
                        BindingPatternKind::ObjectPattern(obj_pattern) => {
                            for prop in &obj_pattern.properties {
                                self.check_expr(&prop.key);
                            }
                        }
                        BindingPatternKind::Identifier(ident) => {
                            self.check_str(&ident.name.to_string());
                            if let Some(type_annotation) = &param.pattern.type_annotation {
                                self.check_type(&type_annotation);
                            }
                        }
                        BindingPatternKind::ArrayPattern(array_pattern) => {
                            for elem in &array_pattern.elements {
                                self.check_expr(&elem);
                            }
                        }
                    }    
                }
                if arrow.expression {
                    self.check_expr(&arrow.body);
                } else {
                    for statement in &arrow.body.statements {
                        self.visit_statement(statement);
                    }
                }
            }
            _ => {}
        }
    }

    fn check_type(&mut self, ts_type: &TSType) {
        match ts_type {
            TSType::TSTypeReference(type_ref) => {
                self.check_str(&type_ref.type_name.to_string());
                if let Some(type_params) = &type_ref.type_arguments {
                    for params in &type_params.params {
                        self.check_type(&params);
                    }
                }
            }
            TSType::TSTypeLiteral(type_literal) => {
                for member in &type_literal.members {
                    match member {
                        TSSignature::TSPropertySignature(prop) => {
                            if let Some(t) = &prop.type_annotation {
                                self.check_type(&t);
                            }
                        }
                        _ => {}
                    }
                }
            }
            TSType::TSUnionType(type_union) => {
                for type_arg in &type_union.types {
                    self.check_type(&type_arg);
                }
            }
            TSType::TSArrayType(type_array) => {
                self.check_type(&type_array.element_type);
            }
            TSType::TSTupleType(type_tuple) => {
                for type_arg in &type_tuple.element_types {
                    self.check_type(&type_arg);
                }
            }
            _ => {}
        }
    }
}


impl<'a, 'ast> Visit<'ast> for ProjectReferenceValidator<'a> {
    fn visit_statement(&mut self, stmt: &Statement) {
        match stmt {
            Statement::ImportDeclaration(import) => {
                if let Some(source) = &import.source {
                    self.check_str(source.value.as_str());
                }
            }
            Statement::ExportNamedDeclaration(export) => {
                if let Some(source) = &export.source {
                    self.check_str(source.value.as_str());
                }
                if let Some(decl) = &export.declaration {
                    match decl {
                        Declaration::VariableDeclaration(var_decl) => {
                            for item in &var_decl.declarations {
                                self.check_str(&item.id.kind.as_str());
                            }
                            if let Some(init) = &var_decl.declarations.init {
                                self.check_expr(init);
                            }
                        }
                        Declaration::FunctionDeclaration(func_decl) => {
                            if let Some(id) = &func_decl.id {
                                self.check_str(&id.to_string());
                            }
                            if let Some(return_type) = &func_decl.return_type {
                                self.check_type(&return_type.type_annotation);
                            }
                        }
                        _ => {}
                    }
                }
            }
            Statement::ExportAllDeclaration(export) => {
                if let Some(source) = &export.source {
                    self.check_str(source.value.as_str());
                }
            }
            _ => {}
        }

        walk_statement(self, stmt);
        }
}

fn validate_project_removal_with_ast(
    content: &str,
    projects_to_remove: &Vec<String>,
) -> Result<HashMap<String, Vec<String>>> {
    let allocator = Allocator::default();
    let program = parse_ast_program(&allocator, content, SourceType::ts());
    
    let mut validator = ProjectReferenceValidator {
        projects_to_remove: projects_to_remove,
        matches: HashMap::new(),
    };
    
    walk_program(&mut validator, &program);

    println!("universal_sdk:281 validator.found: {:?}", validator.matches);
    
    Ok(validator.matches)
}

fn validate_remove_from_universal_sdk(
    app_name: &str,
    content: &str,
    project_json: &ProjectPackageJson,
    projects_to_remove: &Vec<String>,
) -> Result<()> {
    println!("universal_sdk:293 Validating universal SDK changes");
    println!("universal_sdk:294 projects_to_remove: {:?}", projects_to_remove);
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);

    let universal_sdk_project_json = project_json;

    let current_deps = &universal_sdk_project_json.dev_dependencies.as_ref().unwrap().additional_deps;
    println!("universal_sdk:299 current_deps: {:?}", current_deps);

    for project in projects_to_remove {
        let kebab_case_project = &project.to_case(Case::Kebab);
        let dep_key = format!("@{}/{}", &kebab_case_app_name, &kebab_case_project);
        println!("universal_sdk:305 dep_key: {:?}", dep_key);
        if current_deps.contains_key(&dep_key) {
            return Err(anyhow::anyhow!("Project {} is still in universal-sdk/package.json", project));
        } else {
            println!("universal_sdk:309 ✅ AST validation: Project {} successfully removed from package.json", project);
        }
    }
    
    let mut failed_projects = vec![];
    match validate_project_removal_with_ast(content, projects_to_remove) {
        Ok(matches) => {
            for project in projects_to_remove {
                let kebab_case_project = &project.to_case(Case::Kebab);
                if let Some(found) = matches.get(kebab_case_project) {
                    println!("❌ AST validation: Found {} references for project '{}':", found.len(), project);
                    for (i, reference) in found.iter().enumerate() {
                        println!("   {}. {}", i + 1, reference);
                    }
                    failed_projects.push(project.clone());
                } else {
                    println!("✅ AST validation: No references found for project '{}'", project);
                }
                println!("universal_sdk:331 failed_projects: {:?}", failed_projects);
            } 
        }
        Err(e) => {
            println!("❌ AST validation error: {}", e);
            return Err(anyhow::anyhow!("Failed to validate project removal with AST: {}", e));
        }
    }
    
    if failed_projects.is_empty() {
        println!("🎉 AST validation: Successfully removed all projects from universal-sdk/universalSdk.ts");
        println!("🎉 AST validation: All {} projects were cleanly removed", projects_to_remove.len());
    } else {
        println!("❌ AST validation: Failed to remove {} out of {} projects from universal-sdk/universalSdk.ts", 
                 failed_projects.len(), projects_to_remove.len());
        println!("❌ AST validation: Failed projects: {:?}", failed_projects);
        return Err(anyhow::anyhow!("Failed to remove projects from universal-sdk/universalSdk.ts: {:?}", failed_projects));
    }
    Ok(())
}