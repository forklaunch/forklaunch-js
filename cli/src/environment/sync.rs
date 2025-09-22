use anyhow::Result;
use clap::{ArgMatches, Command};
use colored::Colorize;
use std::collections::HashMap;
use std::path::Path;

use super::ast_parser::find_all_env_vars;
use super::env_utils::{
    add_env_vars_to_file, find_workspace_root, get_modules_path, get_target_env_file,
    is_env_var_defined,
};
use crate::CliCommand;

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
        let dry_run = matches.get_flag("dry-run");

        if dry_run {
            println!(
                "{}",
                "🔍 Dry run mode - no changes will be made".yellow().bold()
            );
        } else {
            println!("{}", "🔄 Syncing environment variables...".blue().bold());
        }

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

        // First, run validation to see what's missing
        println!("\n{}", "🔍 Running validation first...".blue());
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
            println!(
                "{}",
                "✅ No missing environment variables found!".green().bold()
            );
            return Ok(());
        }

        // Analyze which variables should go to root vs project level
        let sync_plan = create_sync_plan(&missing_vars_by_project, &workspace_root, &modules_path)?;

        display_sync_plan(&sync_plan);

        if !dry_run {
            execute_sync_plan(&sync_plan)?;
            println!("\n{}", "✅ Environment sync completed!".green().bold());
            println!("💡 Remember to fill in the actual values for the added variables.");
        } else {
            println!(
                "\n{}",
                "ℹ️  This was a dry run. Use 'forklaunch environment sync' to apply changes."
                    .blue()
            );
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
    // Count how many projects use each variable
    let mut var_usage_count: HashMap<String, Vec<String>> = HashMap::new();

    for (project_name, missing_vars) in missing_vars_by_project {
        for var_name in missing_vars {
            var_usage_count
                .entry(var_name.clone())
                .or_insert_with(Vec::new)
                .push(project_name.clone());
        }
    }

    // Variables used by 2+ projects should go to root
    let mut root_vars = Vec::new();
    let mut project_specific_vars: HashMap<String, Vec<String>> = HashMap::new();

    for (var_name, projects) in var_usage_count {
        if projects.len() >= 2 {
            root_vars.push(var_name);
        } else {
            // Single project variable
            let project_name = &projects[0];
            project_specific_vars
                .entry(project_name.clone())
                .or_insert_with(Vec::new)
                .push(var_name);
        }
    }

    // Determine target files
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

fn display_sync_plan(plan: &SyncPlan) {
    println!("\n{}", "📋 Sync Plan".blue().bold());
    println!("{}", "═".repeat(40));

    if !plan.root_vars.is_empty() {
        println!(
            "\n🌍 {} variables to add to root .env.local:",
            plan.root_vars.len()
        );
        println!("   📄 {}", plan.root_env_file.display());
        for var_name in &plan.root_vars {
            println!("   • {}", var_name.cyan());
        }
    }

    if !plan.project_vars.is_empty() {
        println!("\n📦 Project-specific variables:");
        for (project_name, vars) in &plan.project_vars {
            if let Some(env_file) = plan.project_env_files.get(project_name) {
                println!("\n   {} ({} variables):", project_name.bold(), vars.len());
                println!("   📄 {}", env_file.display());
                for var_name in vars {
                    println!("   • {}", var_name.cyan());
                }
            }
        }
    }

    let total_vars =
        plan.root_vars.len() + plan.project_vars.values().map(|v| v.len()).sum::<usize>();

    println!(
        "\n📊 Total variables to add: {}",
        total_vars.to_string().yellow().bold()
    );
}

fn execute_sync_plan(plan: &SyncPlan) -> Result<()> {
    println!("\n{}", "🚀 Executing sync plan...".blue().bold());

    // Add root variables
    if !plan.root_vars.is_empty() {
        println!(
            "📝 Adding {} variables to root .env.local...",
            plan.root_vars.len()
        );

        let mut root_vars_map = HashMap::new();
        for var_name in &plan.root_vars {
            root_vars_map.insert(var_name.clone(), String::new());
        }

        add_env_vars_to_file(&plan.root_env_file, &root_vars_map)?;
        println!(
            "   ✅ Root variables added to {}",
            plan.root_env_file.display()
        );
    }

    // Add project-specific variables
    for (project_name, vars) in &plan.project_vars {
        if let Some(env_file) = plan.project_env_files.get(project_name) {
            println!("📝 Adding {} variables to {}...", vars.len(), project_name);

            let mut project_vars_map = HashMap::new();
            for var_name in vars {
                project_vars_map.insert(var_name.clone(), String::new());
            }

            add_env_vars_to_file(env_file, &project_vars_map)?;
            println!("   ✅ Variables added to {}", env_file.display());
        }
    }

    Ok(())
}
