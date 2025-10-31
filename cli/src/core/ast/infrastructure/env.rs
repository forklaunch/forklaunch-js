use std::{collections::HashSet, fs, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::{CallExpression, Expression};
use oxc_ast_visit::Visit;
use oxc_parser::{Parser, ParserReturn};
use oxc_span::SourceType;

use crate::core::rendered_template::RenderedTemplatesCache;

#[derive(Debug, Clone)]
pub struct EnvVarUsage {
    pub var_name: String,
    #[allow(dead_code)]
    pub line: usize,
    #[allow(dead_code)]
    pub column: usize,
}

pub struct EnvVarVisitor {
    pub env_vars: Vec<EnvVarUsage>,
}

impl EnvVarVisitor {
    pub fn new() -> Self {
        Self {
            env_vars: Vec::new(),
        }
    }
}

impl<'a> Visit<'a> for EnvVarVisitor {
    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        if let Expression::Identifier(ident) = &call.callee {
            if ident.name == "getEnvVar" {
                if let Some(arg) = call.arguments.first() {
                    if let Some(Expression::StringLiteral(str_lit)) = arg.as_expression() {
                        let var_name = str_lit.value.to_string();

                        let line = str_lit.span.start as usize;

                        self.env_vars.push(EnvVarUsage {
                            var_name,
                            line,
                            column: 0,
                        });
                    }
                }
            }
        }

        oxc_ast_visit::walk::walk_call_expression(self, call);
    }
}

pub fn extract_env_vars_from_file(
    file_path: &Path,
    rendered_templates_cache: &RenderedTemplatesCache,
) -> Result<Vec<EnvVarUsage>> {
    let source_code = rendered_templates_cache.get(file_path)?.unwrap().content;

    extract_env_vars_from_source(&source_code)
}

pub fn extract_env_vars_from_source(source_code: &str) -> Result<Vec<EnvVarUsage>> {
    let allocator = Allocator::default();

    let ParserReturn {
        program, errors, ..
    } = Parser::new(
        &allocator,
        source_code,
        SourceType::default().with_typescript(true),
    )
    .parse();

    if !errors.is_empty() {
        log::debug!("TypeScript parse errors during env scan: {:?}", errors);
    }

    let mut visitor = EnvVarVisitor::new();
    visitor.visit_program(&program);

    Ok(visitor.env_vars)
}

pub fn find_all_env_vars(
    modules_path: &Path,
    rendered_templates_cache: &RenderedTemplatesCache,
) -> Result<std::collections::HashMap<String, Vec<EnvVarUsage>>> {
    let mut all_env_vars = std::collections::HashMap::new();

    let registrations_files = find_registrations_files(modules_path)?;

    for file_path in registrations_files {
        let project_name = get_project_name_from_path(&file_path)?;
        let env_vars = extract_env_vars_from_file(&file_path, rendered_templates_cache)?;
        all_env_vars.insert(project_name, env_vars);
    }

    Ok(all_env_vars)
}

fn find_registrations_files(modules_path: &Path) -> Result<Vec<std::path::PathBuf>> {
    let mut registrations_files = Vec::new();

    if !modules_path.exists() {
        return Ok(registrations_files);
    }

    for entry in fs::read_dir(modules_path)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            let registrations_path = path.join("registrations.ts");
            if registrations_path.exists() {
                registrations_files.push(registrations_path);
            }
        }
    }

    Ok(registrations_files)
}

fn get_project_name_from_path(file_path: &Path) -> Result<String> {
    let parent = file_path
        .parent()
        .ok_or_else(|| anyhow::anyhow!("Invalid file path"))?;

    let project_name = parent
        .file_name()
        .ok_or_else(|| anyhow::anyhow!("Could not extract project name"))?
        .to_string_lossy()
        .to_string();

    Ok(project_name)
}

#[allow(dead_code)]
pub fn get_unique_env_vars(
    project_env_vars: &std::collections::HashMap<String, Vec<EnvVarUsage>>,
) -> HashSet<String> {
    let mut unique_vars = HashSet::new();

    for env_vars in project_env_vars.values() {
        for env_var in env_vars {
            unique_vars.insert(env_var.var_name.clone());
        }
    }

    unique_vars
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_env_vars_basic() {
        let source = r#"
        const environmentConfig = configInjector.chain({
          HOST: {
            lifetime: Lifetime.Singleton,
            type: string,
            value: getEnvVar('HOST')
          },
          PORT: {
            lifetime: Lifetime.Singleton,
            type: number,
            value: Number(getEnvVar('PORT'))
          }
        });
        "#;

        let env_vars = extract_env_vars_from_source(source).unwrap();
        assert_eq!(env_vars.len(), 2);

        let var_names: HashSet<_> = env_vars.iter().map(|v| &v.var_name).collect();
        assert!(var_names.contains(&"HOST".to_string()));
        assert!(var_names.contains(&"PORT".to_string()));
    }

    #[test]
    fn test_extract_env_vars_with_defaults() {
        let source = r#"
        const environmentConfig = configInjector.chain({
          VERSION: {
            lifetime: Lifetime.Singleton,
            type: optional(string),
            value: getEnvVar('VERSION') ?? 'v1'
          },
          CORS_ORIGINS: {
            lifetime: Lifetime.Singleton,
            type: array(string),
            value: getEnvVar('CORS_ORIGINS')?.split(',')
          }
        });
        "#;

        let env_vars = extract_env_vars_from_source(source).unwrap();
        assert_eq!(env_vars.len(), 2);

        let var_names: HashSet<_> = env_vars.iter().map(|v| &v.var_name).collect();
        assert!(var_names.contains(&"VERSION".to_string()));
        assert!(var_names.contains(&"CORS_ORIGINS".to_string()));
    }
}
