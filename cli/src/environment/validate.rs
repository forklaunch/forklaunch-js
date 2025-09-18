use anyhow::Result;
use clap::{ArgMatches, Command};
use colored::Colorize;
use std::collections::HashMap;
use std::path::Path;

use super::ast_parser::{EnvVarUsage, find_all_env_vars};
use super::env_utils::{find_workspace_root, get_modules_path, is_env_var_defined};
use crate::CliCommand;

#[derive(Debug)]
pub(crate) struct ValidateCommand;

impl ValidateCommand {
    pub(crate) fn new() -> Self {
        Self
    }
}

impl CliCommand for ValidateCommand {
    fn command(&self) -> Command {
        Command::new("validate")
            .about("Check all workspace projects for missing environment variables")
            .long_about("Validates that all environment variables referenced in registrations.ts files have corresponding entries in .env files")
    }

    fn handler(&self, _matches: &ArgMatches) -> Result<()> {
        println!("{}", "🔍 Validating environment variables...".blue().bold());

        // Find workspace root and modules path
        let current_dir = std::env::current_dir()?;
        let workspace_root = find_workspace_root(&current_dir)?;
        let modules_path = get_modules_path(&workspace_root)?;

        println!("📁 Workspace: {}", workspace_root.display());
        println!("📦 Modules path: {}", modules_path.display());

        // Extract environment variables from all registrations.ts files
        let project_env_vars = find_all_env_vars(&modules_path)?;

        if project_env_vars.is_empty() {
            println!("{}", "⚠️  No projects with registrations.ts found".yellow());
            return Ok(());
        }

        println!("\n{} projects found:", project_env_vars.len());
        for project_name in project_env_vars.keys() {
            println!("  • {}", project_name);
        }

        let mut validation_results = ValidationResults::new();

        for (project_name, env_vars) in &project_env_vars {
            let project_path = modules_path.join(project_name);
            let project_result = validate_project(&project_path, env_vars)?;
            validation_results.add_project_result(project_name.clone(), project_result);
        }

        display_validation_results(&validation_results);

        analyze_env_hierarchy(&project_env_vars, &modules_path, &workspace_root)?;

        if validation_results.has_missing_vars() {
            std::process::exit(1);
        }

        Ok(())
    }
}

#[derive(Debug)]
struct ProjectValidationResult {
    missing_vars: Vec<EnvVarUsage>,
    defined_vars: Vec<String>,
}

#[derive(Debug)]
struct ValidationResults {
    projects: HashMap<String, ProjectValidationResult>,
}

impl ValidationResults {
    fn new() -> Self {
        Self {
            projects: HashMap::new(),
        }
    }

    fn add_project_result(&mut self, project_name: String, result: ProjectValidationResult) {
        self.projects.insert(project_name, result);
    }

    fn has_missing_vars(&self) -> bool {
        self.projects
            .values()
            .any(|result| !result.missing_vars.is_empty())
    }

    fn total_missing_count(&self) -> usize {
        self.projects
            .values()
            .map(|result| result.missing_vars.len())
            .sum()
    }
}

fn validate_project(
    project_path: &Path,
    env_vars: &[EnvVarUsage],
) -> Result<ProjectValidationResult> {
    let mut missing_vars = Vec::new();
    let mut defined_vars = Vec::new();

    for env_var in env_vars {
        if is_env_var_defined(project_path, &env_var.var_name)? {
            defined_vars.push(env_var.var_name.clone());
        } else {
            missing_vars.push(env_var.clone());
        }
    }

    Ok(ProjectValidationResult {
        missing_vars,
        defined_vars,
    })
}

fn display_validation_results(results: &ValidationResults) {
    println!("\n{}", "📊 Validation Results".blue().bold());
    println!("{}", "═".repeat(50));

    let mut has_any_missing = false;

    for (project_name, result) in &results.projects {
        println!("\n📦 {}", project_name.bold());

        if result.missing_vars.is_empty() {
            println!("  {} All environment variables are defined", "✅".green());
        } else {
            has_any_missing = true;
            println!(
                "  {} {} missing environment variables:",
                "❌".red(),
                result.missing_vars.len()
            );

            for missing_var in &result.missing_vars {
                println!(
                    "    • {} (line {})",
                    missing_var.var_name.red(),
                    missing_var.line.to_string().yellow()
                );
            }
        }

        if !result.defined_vars.is_empty() {
            println!(
                "  {} {} defined variables:",
                "✅".green(),
                result.defined_vars.len()
            );
            for defined_var in &result.defined_vars {
                println!("    • {}", defined_var.green());
            }
        }
    }

    // Summary
    println!("\n{}", "📈 Summary".blue().bold());
    println!("{}", "─".repeat(30));

    let total_projects = results.projects.len();
    let projects_with_issues = results
        .projects
        .values()
        .filter(|result| !result.missing_vars.is_empty())
        .count();
    let total_missing = results.total_missing_count();

    println!("Projects scanned: {}", total_projects);
    println!(
        "Projects with missing vars: {}",
        if projects_with_issues > 0 {
            projects_with_issues.to_string().red()
        } else {
            projects_with_issues.to_string().green()
        }
    );
    println!(
        "Total missing variables: {}",
        if total_missing > 0 {
            total_missing.to_string().red()
        } else {
            total_missing.to_string().green()
        }
    );

    if has_any_missing {
        println!(
            "\n{} Run {} to automatically add missing variables with blank values",
            "💡".yellow(),
            "forklaunch environment sync".cyan()
        );
    } else {
        println!(
            "\n{} All environment variables are properly configured!",
            "🎉".green()
        );
    }
}

fn analyze_env_hierarchy(
    project_env_vars: &HashMap<String, Vec<EnvVarUsage>>,
    _modules_path: &Path,
    workspace_root: &Path,
) -> Result<()> {
    println!("\n{}", "🔄 Environment Hierarchy Analysis".blue().bold());
    println!("{}", "═".repeat(50));

    // Find variables that appear in multiple projects
    let mut var_counts: HashMap<String, Vec<String>> = HashMap::new();

    for (project_name, env_vars) in project_env_vars {
        for env_var in env_vars {
            var_counts
                .entry(env_var.var_name.clone())
                .or_insert_with(Vec::new)
                .push(project_name.clone());
        }
    }

    // Find common variables (used in multiple projects)
    let mut common_vars: Vec<(&String, &Vec<String>)> = var_counts
        .iter()
        .filter(|(_, projects)| projects.len() > 1)
        .collect();
    common_vars.sort_by_key(|(_, projects)| std::cmp::Reverse(projects.len()));

    if common_vars.is_empty() {
        println!("No common environment variables found across projects.");
        return Ok(());
    }

    println!("Common variables that could be moved to root .env.local:");
    println!();

    for (var_name, projects) in &common_vars {
        println!(
            "🔗 {} (used in {} projects)",
            var_name.cyan().bold(),
            projects.len()
        );
        for project in projects.iter() {
            println!("   └─ {}", project);
        }
        println!();
    }

    // Check if root .env.local exists
    let root_env_local = workspace_root.join(".env.local");
    if root_env_local.exists() {
        println!("📄 Root .env.local exists at: {}", root_env_local.display());
    } else {
        println!("📄 Root .env.local not found. Consider creating one for common variables.");
    }

    Ok(())
}
