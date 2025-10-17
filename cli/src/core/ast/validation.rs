use std::{collections::HashMap, io::Write};
use anyhow::Result;
use convert_case::{Case, Casing};
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};

use oxc_ast_visit::{Visit, walk::{walk_statement, walk_program}};
use oxc_ast::ast::{Statement, Expression, TSType, Declaration, TSSignature, BindingPatternKind, ObjectPropertyKind, Argument, Program};

use crate::core::{
    package_json::project_package_json::ProjectPackageJson,
};

struct ProjectReferenceValidator<'a> {
    projects_to_remove: &'a Vec<String>,
    matches: HashMap<String, Vec<String>>,
}

impl<'a, 'ast> ProjectReferenceValidator<'a> {
    fn check_str(&mut self, s: &str) {
        for project in self.projects_to_remove {
            let kebab_case_project = &project.to_case(Case::Kebab);
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
                    match arg {
                        Argument::SpreadElement(spread_elem) => {
                            self.check_expr(&spread_elem.argument);
                        }
                        _ => {
                            if let Some(expr) = arg.as_expression() {
                                self.check_expr(expr);
                            }
                        }
                    }
                }
            }
            Expression::ObjectExpression(obj) => {
                for prop in &obj.properties {
                    match prop {
                        ObjectPropertyKind::ObjectProperty(prop) => {
                            if let Some(prop_name) = prop.key.name() {
                                self.check_str(&prop_name);
                            }
                            self.check_expr(&prop.value);
                        }
                        ObjectPropertyKind::SpreadProperty(spread_prop) => {
                            self.check_expr(&spread_prop.argument);
                        }
                    }
                }
            }
            Expression::ParenthesizedExpression(parenthesized_expr) => {
                self.check_expr(&parenthesized_expr.expression);
            }
            Expression::ArrowFunctionExpression(arrow) => {
                for param in &arrow.params.items {
                    self.check_binding_pattern(&param.pattern.kind);    
                    if let Some(type_ann) = &param.pattern.type_annotation {
                        self.check_type(&type_ann.type_annotation);
                    }
                }
                for directive in &arrow.body.directives {
                    self.check_str(&directive.expression.to_string());
                }
                for statement in &arrow.body.statements {
                    self.visit_statement(statement);
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
                                self.check_type(&t.type_annotation);
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
            _ => {}
        }
    }

    fn check_binding_pattern(&mut self, binding_pattern: &BindingPatternKind) {
        match binding_pattern {
            BindingPatternKind::ObjectPattern(obj_pattern) => {
                for prop in &obj_pattern.properties {
                    if let Some(prop_name) = prop.key.name() {
                        self.check_str(&prop_name);
                    }
                    self.check_binding_pattern(&prop.value.kind);
                }
            }
            BindingPatternKind::BindingIdentifier(ident) => {
                self.check_str(&ident.name.to_string());
            }
            BindingPatternKind::ArrayPattern(array_pattern) => {
                for elem in &array_pattern.elements {
                    if let Some(elem) = elem {
                        self.check_binding_pattern(&elem.kind);
                        if let Some(type_annotation) = &elem.type_annotation {
                            self.check_type(&type_annotation.type_annotation);
                        }
                    }
                }
            }
            BindingPatternKind::AssignmentPattern(assign_pattern) => {
                self.check_binding_pattern(&assign_pattern.left.kind);
                self.check_expr(&assign_pattern.right);
            }
        }
    }
}


impl<'a, 'ast> Visit<'ast> for ProjectReferenceValidator<'a> {
    fn visit_statement(&mut self, stmt: &Statement) {
        match stmt {
            Statement::ImportDeclaration(import) => {
                self.check_str(import.source.value.as_str());
            }
            Statement::ExportNamedDeclaration(export) => {
                if let Some(source) = &export.source {
                    self.check_str(source.value.as_str());
                }
                if let Some(declaration) = &export.declaration {
                    match declaration {
                        Declaration::VariableDeclaration(var_decl) => {
                            for item in &var_decl.declarations {
                                self.check_binding_pattern(&item.id.kind);
                                if let Some(init) = &item.init {
                                    self.check_expr(init);
                                }
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
                self.check_str(export.source.value.as_str());
            }
            _ => {}
        }
        walk_statement(self, stmt);
    }
}

pub(crate) fn validate_project_removal_with_ast(
    content: &Program,
    projects_to_remove: &Vec<String>,
) -> Result<HashMap<String, Vec<String>>> {
    
    let mut validator = ProjectReferenceValidator {
        projects_to_remove: projects_to_remove,
        matches: HashMap::new(),
    };
    
    walk_program(&mut validator, &content);

    
    Ok(validator.matches)
}

pub(crate) fn validate_remove_from_universal_sdk(
    app_name: &str,
    content: &Program,
    project_json: &ProjectPackageJson,
    projects_to_remove: &Vec<String>,
    stdout: &mut StandardStream,
) -> Result<()> {
    let kebab_case_app_name = &app_name.to_case(Case::Kebab);

    let universal_sdk_project_json = project_json;

    let current_deps = &universal_sdk_project_json.dev_dependencies.as_ref().unwrap().additional_deps;

    for project in projects_to_remove {
        let kebab_case_project = &project.to_case(Case::Kebab);
        let dep_key = format!("@{}/{}", &kebab_case_app_name, &kebab_case_project);
        if current_deps.contains_key(&dep_key) {
            return Err(anyhow::anyhow!("Project {} is still in universal-sdk/package.json", project));
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "AST validation: Project {} successfully removed from package.json", project)?;
            stdout.reset()?;
        }
    }
    
    let mut failed_projects = vec![];
    match validate_project_removal_with_ast(content, projects_to_remove) {
        Ok(matches) => {
            for project in projects_to_remove {
                let kebab_case_project = &project.to_case(Case::Kebab);
                if let Some(found) = matches.get(kebab_case_project) {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                    writeln!(stdout, "AST validation: Found {} references for project '{}':", found.len(), project)?;
                    stdout.reset()?;
                    for (i, reference) in found.iter().enumerate() {
                        writeln!(stdout, "   {}. {}", i + 1, reference)?;
                    }
                    failed_projects.push(project.clone());
                } else {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                    writeln!(stdout, "AST validation: No references found for project '{}'", project)?;
                    stdout.reset()?;
                }
            } 
        }
        Err(e) => {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(stdout, "AST validation error: {}", e)?;
            stdout.reset()?;
            return Err(anyhow::anyhow!("Failed to validate project removal with AST: {}", e));
        }
    }
    
    if failed_projects.is_empty() {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(stdout, "AST validation: Successfully removed all projects from universal-sdk/universalSdk.ts")?;
        writeln!(stdout, "AST validation: All {} projects were cleanly removed", projects_to_remove.len())?;
        stdout.reset()?;
    } else {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
        writeln!(stdout, "AST validation: Failed to remove {} out of {} projects from universal-sdk/universalSdk.ts", 
                 failed_projects.len(), projects_to_remove.len())?;
        writeln!(stdout, "AST validation: Failed projects: {:?}", failed_projects)?;
        stdout.reset()?;
        return Err(anyhow::anyhow!("Failed to remove projects from universal-sdk/universalSdk.ts: {:?}", failed_projects));
    }
    Ok(())
}