use std::collections::HashMap;

use anyhow::Result;

use crate::core::{
    ast::infrastructure::env::EnvVarUsage,
    manifest::{ProjectType, application::ApplicationManifestData},
};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub(crate) enum EnvironmentVariableScope {
    Application,
    Service,
    Worker,
}

#[derive(Debug, Clone)]
pub(crate) struct ScopedEnvVar {
    pub name: String,
    pub scope: EnvironmentVariableScope,
    pub scope_id: Option<String>, // service/worker name if scoped
    pub used_by: Vec<String>,     // List of projects using this variable
}

impl EnvironmentVariableScope {
    #[allow(dead_code)]
    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            EnvironmentVariableScope::Application => "application",
            EnvironmentVariableScope::Service => "service",
            EnvironmentVariableScope::Worker => "worker",
        }
    }
}

/// Determine the scope for each environment variable based on usage patterns
pub(crate) fn determine_env_var_scopes(
    project_env_vars: &HashMap<String, Vec<EnvVarUsage>>,
    manifest: &ApplicationManifestData,
) -> Result<Vec<ScopedEnvVar>> {
    // Group env vars by name and track which projects use them
    let mut var_usage: HashMap<String, Vec<String>> = HashMap::new();

    for (project_name, env_vars) in project_env_vars {
        for env_var in env_vars {
            var_usage
                .entry(env_var.var_name.clone())
                .or_insert_with(Vec::new)
                .push(project_name.clone());
        }
    }

    let mut scoped_vars = Vec::new();

    for (var_name, projects) in var_usage {
        // Deduplicate projects
        let mut unique_projects: Vec<String> = projects
            .into_iter()
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        unique_projects.sort();

        let (scope, scope_id) = if unique_projects.len() > 1
            || unique_projects
                .iter()
                .any(|p| p == "core" || p == "monitoring")
        {
            (EnvironmentVariableScope::Application, None)
        } else if let Some(project_name) = unique_projects.first() {
            let project_type = manifest
                .projects
                .iter()
                .find(|p| &p.name == project_name)
                .map(|p| &p.r#type);

            match project_type {
                Some(ProjectType::Service) => (
                    EnvironmentVariableScope::Service,
                    Some(project_name.clone()),
                ),
                Some(ProjectType::Worker) => {
                    (EnvironmentVariableScope::Worker, Some(project_name.clone()))
                }
                _ => (EnvironmentVariableScope::Application, None),
            }
        } else {
            (EnvironmentVariableScope::Application, None)
        };

        scoped_vars.push(ScopedEnvVar {
            name: var_name,
            scope,
            scope_id,
            used_by: unique_projects,
        });
    }

    scoped_vars.sort_by(|a, b| match a.scope.cmp(&b.scope) {
        std::cmp::Ordering::Equal => a.name.cmp(&b.name),
        other => other,
    });

    Ok(scoped_vars)
}
