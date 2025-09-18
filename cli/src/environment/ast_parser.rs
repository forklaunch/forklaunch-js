use anyhow::{Context, Result};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use swc_core::ecma::ast::*;
use swc_core::ecma::parser::{Parser, StringInput, Syntax, TsSyntax, lexer::Lexer};
use swc_core::ecma::visit::{Visit, VisitWith};

#[derive(Debug, Clone)]
pub struct EnvVarUsage {
    pub var_name: String,
    pub line: usize,
    #[allow(dead_code)]
    pub column: usize,
}

pub struct EnvVarVisitor {
    pub env_vars: Vec<EnvVarUsage>,
    pub source_map: swc_core::common::SourceMap,
}

impl EnvVarVisitor {
    pub fn new(source_map: swc_core::common::SourceMap) -> Self {
        Self {
            env_vars: Vec::new(),
            source_map,
        }
    }
}

impl Visit for EnvVarVisitor {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        // Look for getEnvVar function calls
        if let Callee::Expr(expr) = &call.callee {
            if let Expr::Ident(ident) = expr.as_ref() {
                if ident.sym.as_ref() == "getEnvVar" {
                    // Extract the environment variable name from the first argument
                    if let Some(arg) = call.args.first() {
                        if let Expr::Lit(Lit::Str(str_lit)) = arg.expr.as_ref() {
                            let var_name = str_lit.value.to_string();

                            // Get line and column information
                            let loc = self.source_map.lookup_char_pos(call.span.lo);

                            self.env_vars.push(EnvVarUsage {
                                var_name,
                                line: loc.line,
                                column: loc.col_display,
                            });
                        }
                    }
                }
            }
        }

        // Continue visiting child nodes
        call.visit_children_with(self);
    }
}

/// Parse a registrations.ts file and extract all getEnvVar calls
pub fn extract_env_vars_from_file(file_path: &Path) -> Result<Vec<EnvVarUsage>> {
    let source_code = fs::read_to_string(file_path)
        .with_context(|| format!("Failed to read file: {}", file_path.display()))?;

    extract_env_vars_from_source(&source_code)
}

/// Parse TypeScript source code and extract all getEnvVar calls
pub fn extract_env_vars_from_source(source_code: &str) -> Result<Vec<EnvVarUsage>> {
    let source_map = swc_core::common::SourceMap::default();
    let source_file = source_map.new_source_file(
        swc_core::common::sync::Lrc::new(swc_core::common::FileName::Custom(
            "registrations.ts".into(),
        )),
        source_code.to_string(),
    );

    let lexer = Lexer::new(
        Syntax::Typescript(TsSyntax {
            tsx: false,
            decorators: false,
            dts: false,
            no_early_errors: false,
            disallow_ambiguous_jsx_like: true,
        }),
        Default::default(),
        StringInput::from(&*source_file),
        None,
    );

    let mut parser = Parser::new_from(lexer);
    let module = parser
        .parse_module()
        .map_err(|e| anyhow::anyhow!("Failed to parse TypeScript: {:?}", e))?;

    let mut visitor = EnvVarVisitor::new(source_map);
    module.visit_with(&mut visitor);

    Ok(visitor.env_vars)
}

/// Find all environment variables used across all registrations.ts files in the workspace
pub fn find_all_env_vars(
    modules_path: &Path,
) -> Result<std::collections::HashMap<String, Vec<EnvVarUsage>>> {
    let mut all_env_vars = std::collections::HashMap::new();

    // Find all registrations.ts files
    let registrations_files = find_registrations_files(modules_path)?;

    for file_path in registrations_files {
        let project_name = get_project_name_from_path(&file_path)?;
        let env_vars = extract_env_vars_from_file(&file_path)?;
        all_env_vars.insert(project_name, env_vars);
    }

    Ok(all_env_vars)
}

/// Find all registrations.ts files in the modules directory
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

/// Extract project name from the registrations.ts file path
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

/// Get unique environment variables across all projects
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
