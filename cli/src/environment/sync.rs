use std::{collections::HashMap, io::Write, path::Path};

use anyhow::Result;
use clap::{ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::{
        ast::infrastructure::env::find_all_env_vars,
        env::{
            add_env_vars_to_file, find_workspace_root, get_modules_path, get_target_env_file,
            is_env_var_defined,
        },
    },
};

#[derive(Debug)]
pub(crate) struct SyncCommand;

impl SyncCommand {
    pub(crate) fn new() -> Self {
        Self
    }
}

impl CliCommand for SyncCommand {
    fn command(&self) -> Command {
        Command::new("sync")
            .about("Sync missing environment variables by adding them with blank values")
            .long_about("Uses validate to find missing environment variables and adds them to appropriate .env files with blank values. Respects the .env hierarchy by placing common variables in root .env.local")
            .arg(
                clap::Arg::new("dry-run")
                    .long("dry-run")
                    .short('n')
                    .help("Show what would be done without making changes")
                    .action(clap::ArgAction::SetTrue)
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let dry_run = matches.get_flag("dry-run");

        if dry_run {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
            writeln!(stdout, "Dry run mode - no changes will be made")?;
            stdout.reset()?;
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "Syncing environment variables...")?;
            stdout.reset()?;
        }

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

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
        writeln!(stdout, "\nRunning validation first...")?;
        stdout.reset()?;
        let mut missing_vars_by_project = HashMap::new();

        for (project_name, env_vars) in &project_env_vars {
            let project_path = modules_path.join(project_name);
            let mut missing_set = std::collections::HashSet::new();

            for env_var in env_vars {
                if !is_env_var_defined(&project_path, &env_var.var_name)? {
                    missing_set.insert(env_var.var_name.clone());
                }
            }

            if !missing_set.is_empty() {
                let mut vars: Vec<String> = missing_set.into_iter().collect();
                vars.sort();
                missing_vars_by_project.insert(project_name.clone(), vars);
            }
        }

        if missing_vars_by_project.is_empty() {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "No missing environment variables found!")?;
            stdout.reset()?;
            return Ok(());
        }

        let sync_plan = create_sync_plan(&missing_vars_by_project, &workspace_root, &modules_path)?;

        display_sync_plan(&sync_plan, &mut stdout)?;

        if !dry_run {
            execute_sync_plan(&sync_plan, &mut stdout)?;
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "\nEnvironment sync completed!")?;
            stdout.reset()?;
            writeln!(
                stdout,
                "Remember to fill in the actual values for the added variables."
            )?;
        } else {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(
                stdout,
                "\nThis was a dry run. Use 'forklaunch environment sync' to apply changes."
            )?;
            stdout.reset()?;
        }

        Ok(())
    }
}

#[derive(Debug)]
struct SyncPlan {
    root_vars: Vec<String>,
    project_vars: HashMap<String, Vec<String>>,
    root_env_file: std::path::PathBuf,
    project_env_files: HashMap<String, std::path::PathBuf>,
}

fn create_sync_plan(
    missing_vars_by_project: &HashMap<String, Vec<String>>,
    workspace_root: &Path,
    modules_path: &Path,
) -> Result<SyncPlan> {
    let mut var_usage_count: HashMap<String, Vec<String>> = HashMap::new();

    for (project_name, missing_vars) in missing_vars_by_project {
        for var_name in missing_vars {
            var_usage_count
                .entry(var_name.clone())
                .or_insert_with(Vec::new)
                .push(project_name.clone());
        }
    }

    let mut root_vars = Vec::new();
    let mut project_specific_vars: HashMap<String, Vec<String>> = HashMap::new();

    for (var_name, projects) in var_usage_count {
        if projects.len() >= 2 {
            root_vars.push(var_name);
        } else {
            let project_name = &projects[0];
            project_specific_vars
                .entry(project_name.clone())
                .or_insert_with(Vec::new)
                .push(var_name);
        }
    }

    let root_env_file = workspace_root.join(".env.local");
    let mut project_env_files = HashMap::new();

    for project_name in missing_vars_by_project.keys() {
        let project_path = modules_path.join(project_name);
        let target_file = get_target_env_file(&project_path)?;
        project_env_files.insert(project_name.clone(), target_file);
    }

    Ok(SyncPlan {
        root_vars,
        project_vars: project_specific_vars,
        root_env_file,
        project_env_files,
    })
}

fn display_sync_plan(plan: &SyncPlan, stdout: &mut StandardStream) -> Result<()> {
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "\nSync Plan")?;
    stdout.reset()?;
    writeln!(stdout, "{}", "=".repeat(40))?;

    if !plan.root_vars.is_empty() {
        writeln!(
            stdout,
            "\n{} variables to add to root .env.local:",
            plan.root_vars.len()
        )?;
        writeln!(stdout, "   {}", plan.root_env_file.display())?;
        for var_name in &plan.root_vars {
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(stdout, "   - {}", var_name)?;
            stdout.reset()?;
        }
    }

    if !plan.project_vars.is_empty() {
        writeln!(stdout, "\nProject-specific variables:")?;
        for (project_name, vars) in &plan.project_vars {
            if let Some(env_file) = plan.project_env_files.get(project_name) {
                writeln!(stdout, "\n   {} ({} variables):", project_name, vars.len())?;
                writeln!(stdout, "   {}", env_file.display())?;
                for var_name in vars {
                    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
                    writeln!(stdout, "   - {}", var_name)?;
                    stdout.reset()?;
                }
            }
        }
    }

    let total_vars =
        plan.root_vars.len() + plan.project_vars.values().map(|v| v.len()).sum::<usize>();

    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Yellow)))?;
    writeln!(stdout, "\nTotal variables to add: {}", total_vars)?;
    stdout.reset()?;

    Ok(())
}

fn execute_sync_plan(plan: &SyncPlan, stdout: &mut StandardStream) -> Result<()> {
    stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
    writeln!(stdout, "\nExecuting sync plan...")?;
    stdout.reset()?;

    if !plan.root_vars.is_empty() {
        writeln!(
            stdout,
            "Adding {} variables to root .env.local...",
            plan.root_vars.len()
        )?;

        let mut root_vars_map = HashMap::new();
        for var_name in &plan.root_vars {
            root_vars_map.insert(var_name.clone(), String::new());
        }

        add_env_vars_to_file(&plan.root_env_file, &root_vars_map)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
        writeln!(
            stdout,
            "   Root variables added to {}",
            plan.root_env_file.display()
        )?;
        stdout.reset()?;
    }

    for (project_name, vars) in &plan.project_vars {
        if let Some(env_file) = plan.project_env_files.get(project_name) {
            writeln!(
                stdout,
                "Adding {} variables to {}...",
                vars.len(),
                project_name
            )?;

            let mut project_vars_map = HashMap::new();
            for var_name in vars {
                project_vars_map.insert(var_name.clone(), String::new());
            }

            add_env_vars_to_file(env_file, &project_vars_map)?;
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(stdout, "   Variables added to {}", env_file.display())?;
            stdout.reset()?;
        }
    }

    Ok(())
}
