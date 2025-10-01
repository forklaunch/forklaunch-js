use anyhow::Result;
use clap::{ArgMatches, Command};
use std::collections::HashMap;
use std::io::Write;
use std::path::Path;
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::CliCommand;
use crate::core::ast::infrastructure::env::{EnvVarUsage, find_all_env_vars};
use crate::core::env::{find_workspace_root, get_modules_path, is_env_var_defined};

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
        let mut stdout = StandardStream::stdout(ColorChoice::Always);

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "Validating environment variables...")?;
        stdout.reset()?;

        let current_dir = std::env::current_dir()?;
        let workspace_root = find_workspace_root(&current_dir)?;
        let modules_path = get_modules_path(&workspace_root)?;

        writeln!(stdout, "Workspace: {}", workspace_root.display())?;
        writeln!(stdout, "Modules path: {}", modules_path.display())?;

        let project_env_vars = find_all_env_vars(&modules_path)?;

        if project_env_vars.is_empty() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "No projects with registrations.ts found")?;
            stdout.reset()?;
            return Ok(());
        }

        writeln!(stdout, "\n{} projects found:", project_env_vars.len())?;
        for project_name in project_env_vars.keys() {
            writeln!(stdout, "  - {}", project_name)?;
        }

        let mut validation_results = ValidationResults::new();

        for (project_name, env_vars) in &project_env_vars {
            let project_path = modules_path.join(project_name);
            let project_result = validate_project(&project_path, env_vars)?;
            validation_results.add_project_result(project_name.clone(), project_result);
        }

        display_validation_results(&validation_results, &mut stdout)?;

        analyze_env_hierarchy(
            &project_env_vars,
            &modules_path,
            &workspace_root,
            &mut stdout,
        )?;

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

fn display_validation_results(
    results: &ValidationResults,
    stdout: &mut StandardStream,
) -> Result<()> {
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "\nValidation Results")?;
    stdout.reset()?;
    writeln!(stdout, "{}", "=".repeat(50))?;

    let mut has_any_missing = false;

    for (project_name, result) in &results.projects {
        writeln!(stdout, "\n{}", project_name)?;

        if result.missing_vars.is_empty() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "  All environment variables are defined")?;
            stdout.reset()?;
        } else {
            has_any_missing = true;
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
            writeln!(
                stdout,
                "  {} missing environment variables:",
                result.missing_vars.len()
            )?;
            stdout.reset()?;

            for missing_var in &result.missing_vars {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
                write!(stdout, "    - {}", missing_var.var_name)?;
                stdout.reset()?;
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
                writeln!(stdout, " (line {})", missing_var.line)?;
                stdout.reset()?;
            }
        }

        if !result.defined_vars.is_empty() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "  {} defined variables:", result.defined_vars.len())?;
            stdout.reset()?;
            for defined_var in &result.defined_vars {
                stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
                writeln!(stdout, "    - {}", defined_var)?;
                stdout.reset()?;
            }
        }
    }

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "\nSummary")?;
    stdout.reset()?;
    writeln!(stdout, "{}", "-".repeat(30))?;

    let total_projects = results.projects.len();
    let projects_with_issues = results
        .projects
        .values()
        .filter(|result| !result.missing_vars.is_empty())
        .count();
    let total_missing = results.total_missing_count();

    writeln!(stdout, "Projects scanned: {}", total_projects)?;

    if projects_with_issues > 0 {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
    } else {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
    }
    writeln!(
        stdout,
        "Projects with missing vars: {}",
        projects_with_issues
    )?;
    stdout.reset()?;

    if total_missing > 0 {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
    } else {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
    }
    writeln!(stdout, "Total missing variables: {}", total_missing)?;
    stdout.reset()?;

    if has_any_missing {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(
            stdout,
            "\nRun 'forklaunch environment sync' to automatically add missing variables with blank values"
        )?;
        stdout.reset()?;
    } else {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(
            stdout,
            "\nAll environment variables are properly configured!"
        )?;
        stdout.reset()?;
    }

    Ok(())
}

fn analyze_env_hierarchy(
    project_env_vars: &HashMap<String, Vec<EnvVarUsage>>,
    _modules_path: &Path,
    workspace_root: &Path,
    stdout: &mut StandardStream,
) -> Result<()> {
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "\nEnvironment Hierarchy Analysis")?;
    stdout.reset()?;
    writeln!(stdout, "{}", "=".repeat(50))?;

    let mut var_counts: HashMap<String, Vec<String>> = HashMap::new();

    for (project_name, env_vars) in project_env_vars {
        let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
        for env_var in env_vars {
            if seen.insert(env_var.var_name.as_str()) {
                var_counts
                    .entry(env_var.var_name.clone())
                    .or_insert_with(Vec::new)
                    .push(project_name.clone());
            }
        }
    }

    let mut common_vars: Vec<(&String, &Vec<String>)> = var_counts
        .iter()
        .filter(|(_, projects)| projects.len() > 1)
        .collect();
    common_vars.sort_by_key(|(_, projects)| std::cmp::Reverse(projects.len()));

    if common_vars.is_empty() {
        writeln!(
            stdout,
            "No common environment variables found across projects."
        )?;
        return Ok(());
    }

    writeln!(
        stdout,
        "Common variables that could be moved to root .env.local:"
    )?;
    writeln!(stdout)?;

    for (var_name, projects) in &common_vars {
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "{} (used in {} projects)", var_name, projects.len())?;
        stdout.reset()?;
        for project in projects.iter() {
            writeln!(stdout, "   - {}", project)?;
        }
        writeln!(stdout)?;
    }

    let root_env_local = workspace_root.join(".env.local");
    if root_env_local.exists() {
        writeln!(
            stdout,
            "Root .env.local exists at: {}",
            root_env_local.display()
        )?;
    } else {
        writeln!(
            stdout,
            "Root .env.local not found. Consider creating one for common variables."
        )?;
    }

    Ok(())
}
