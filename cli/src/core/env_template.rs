use std::{
    collections::HashMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};

use crate::core::{
    ast::infrastructure::env::find_all_env_vars,
    env::{add_env_vars_to_file, is_env_var_defined},
    manifest::{ProjectType, application::ApplicationManifestData},
    rendered_template::{RenderedTemplate, RenderedTemplatesCache},
    symlink_template::{SymlinkTemplate, create_symlinks},
};

/// Categorize an env var by its prefix into a human-readable category.
fn categorize_env_var(var_name: &str) -> &'static str {
    if var_name.starts_with("DB_") {
        "Database"
    } else if var_name.starts_with("REDIS_") {
        "Cache (Redis)"
    } else if var_name.starts_with("S3_") {
        "Object Store (S3)"
    } else if var_name.starts_with("KAFKA_") {
        "Message Queue (Kafka)"
    } else if var_name.starts_with("OTEL_") {
        "Observability (OpenTelemetry)"
    } else if var_name.starts_with("STRIPE_") {
        "Billing (Stripe)"
    } else if var_name.starts_with("BETTER_AUTH_")
        || var_name.starts_with("PASSWORD_ENCRYPTION_")
        || var_name.starts_with("HMAC_")
        || var_name.starts_with("JWKS_")
        || var_name.starts_with("CORS_")
    {
        "Authentication"
    } else {
        "Application"
    }
}

/// Build the content of a .env.template file from a list of env var names.
fn build_env_template_content(var_names: &[String]) -> String {
    let mut sorted_vars = var_names.to_vec();
    sorted_vars.sort();

    // Group by category
    let mut categories: Vec<(&'static str, Vec<&String>)> = Vec::new();
    let mut category_map: HashMap<&'static str, Vec<&String>> = HashMap::new();

    for var in &sorted_vars {
        let category = categorize_env_var(var);
        category_map.entry(category).or_default().push(var);
    }

    // Define a stable ordering for categories
    let category_order = [
        "Database",
        "Cache (Redis)",
        "Object Store (S3)",
        "Message Queue (Kafka)",
        "Observability (OpenTelemetry)",
        "Billing (Stripe)",
        "Authentication",
        "Application",
    ];

    for cat in &category_order {
        if let Some(vars) = category_map.remove(cat) {
            categories.push((cat, vars));
        }
    }

    let mut content = String::new();
    let mut first = true;

    for (category, vars) in &categories {
        if !first {
            content.push('\n');
        }
        first = false;

        content.push_str(&format!("# {}\n", category));
        for var in vars {
            content.push_str(&format!("{}=\n", var));
        }
    }

    content
}

/// Resolve a worker project to its parent service directory by following
/// the registrations.ts symlink.
fn resolve_worker_service_dir(worker_path: &Path) -> Option<PathBuf> {
    let registrations_path = worker_path.join("registrations.ts");
    if !registrations_path.is_symlink() {
        return None;
    }

    // Read the symlink target and resolve to the service directory
    let target = fs::read_link(&registrations_path).ok()?;
    // The target may be relative to the worker directory
    let absolute_target = if target.is_relative() {
        worker_path.join(&target)
    } else {
        target
    };

    // The service directory is the parent of the resolved registrations.ts
    absolute_target.parent().map(|p| p.to_path_buf())
}

/// Generate .env.template files for each project that has env vars.
///
/// For services: inserts a .env.template into the rendered_templates_cache.
/// For workers: creates a symlink to the parent service's .env.template.
///
/// The caller is responsible for draining and writing the rendered_templates_cache.
pub fn generate_env_templates(
    modules_path: &Path,
    manifest_data: &ApplicationManifestData,
    rendered_templates_cache: &mut RenderedTemplatesCache,
    stdout: &mut StandardStream,
) -> Result<()> {
    let project_env_vars = find_all_env_vars(modules_path, rendered_templates_cache)?;

    if project_env_vars.is_empty() {
        return Ok(());
    }

    let mut symlink_templates: Vec<SymlinkTemplate> = Vec::new();

    for (project_name, env_vars) in &project_env_vars {
        if env_vars.is_empty() {
            continue;
        }

        let project_path = modules_path.join(project_name);
        let template_path = project_path.join(".env.template");

        // Check if this is a worker project
        let is_worker = manifest_data
            .projects
            .iter()
            .any(|p| p.name == *project_name && p.r#type == ProjectType::Worker);

        if is_worker {
            // For workers, create a symlink to the service's .env.template
            if let Some(service_dir) = resolve_worker_service_dir(&project_path) {
                let service_template = service_dir.join(".env.template");
                symlink_templates.push(SymlinkTemplate {
                    path: service_template,
                    target: template_path,
                });
            }
        } else {
            // For services/libraries, generate the template file directly
            let var_names: Vec<String> = env_vars.iter().map(|v| v.var_name.clone()).collect();
            let content = build_env_template_content(&var_names);

            rendered_templates_cache.insert(
                template_path.to_string_lossy().to_string(),
                RenderedTemplate {
                    path: template_path.clone(),
                    content,
                    context: Some(format!(
                        "Failed to write .env.template for {}",
                        project_name
                    )),
                },
            );

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(
                stdout,
                "[OK] Generated .env.template for {}",
                project_name
            )?;
            stdout.reset()?;
        }
    }

    // Create worker symlinks
    if !symlink_templates.is_empty() {
        create_symlinks(&symlink_templates, false, stdout)?;

        for symlink in &symlink_templates {
            let worker_name = symlink
                .target
                .parent()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
            writeln!(
                stdout,
                "[OK] Symlinked .env.template for worker {}",
                worker_name
            )?;
            stdout.reset()?;
        }
    }

    Ok(())
}

/// Sync .env.local files for all projects that have env vars.
/// Ensures each project has all required env vars present (with blank values for missing ones).
pub fn sync_env_local_files(
    modules_path: &Path,
    manifest_data: &ApplicationManifestData,
    stdout: &mut StandardStream,
) -> Result<()> {
    let rendered_templates_cache = RenderedTemplatesCache::new();
    let project_env_vars = find_all_env_vars(modules_path, &rendered_templates_cache)?;

    if project_env_vars.is_empty() {
        return Ok(());
    }

    for (project_name, env_vars) in &project_env_vars {
        if env_vars.is_empty() {
            continue;
        }

        // Only sync for services and workers
        let is_service_or_worker = manifest_data.projects.iter().any(|p| {
            p.name == *project_name
                && (p.r#type == ProjectType::Service || p.r#type == ProjectType::Worker)
        });

        if !is_service_or_worker {
            continue;
        }

        let project_path = modules_path.join(project_name);
        let env_local_path = project_path.join(".env.local");

        let mut missing_vars: HashMap<String, String> = HashMap::new();

        for env_var in env_vars {
            if !is_env_var_defined(&project_path, &env_var.var_name)? {
                missing_vars.insert(env_var.var_name.clone(), String::new());
            }
        }

        if !missing_vars.is_empty() {
            add_env_vars_to_file(&env_local_path, &missing_vars)
                .with_context(|| format!("Failed to sync .env.local for {}", project_name))?;

            let mut var_names: Vec<&String> = missing_vars.keys().collect();
            var_names.sort();

            stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
            writeln!(
                stdout,
                "[INFO] Added {} missing env var(s) to {}: {}",
                missing_vars.len(),
                env_local_path.display(),
                var_names
                    .iter()
                    .map(|s| s.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            )?;
            stdout.reset()?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_categorize_env_var() {
        assert_eq!(categorize_env_var("DB_NAME"), "Database");
        assert_eq!(categorize_env_var("DB_HOST"), "Database");
        assert_eq!(categorize_env_var("REDIS_URL"), "Cache (Redis)");
        assert_eq!(categorize_env_var("S3_BUCKET"), "Object Store (S3)");
        assert_eq!(categorize_env_var("KAFKA_BROKERS"), "Message Queue (Kafka)");
        assert_eq!(
            categorize_env_var("OTEL_EXPORTER_OTLP_ENDPOINT"),
            "Observability (OpenTelemetry)"
        );
        assert_eq!(categorize_env_var("STRIPE_API_KEY"), "Billing (Stripe)");
        assert_eq!(
            categorize_env_var("BETTER_AUTH_BASE_PATH"),
            "Authentication"
        );
        assert_eq!(
            categorize_env_var("PASSWORD_ENCRYPTION_SECRET_PATH"),
            "Authentication"
        );
        assert_eq!(categorize_env_var("HMAC_SECRET_KEY"), "Authentication");
        assert_eq!(categorize_env_var("JWKS_PUBLIC_KEY_URL"), "Authentication");
        assert_eq!(categorize_env_var("CORS_ORIGINS"), "Authentication");
        assert_eq!(categorize_env_var("HOST"), "Application");
        assert_eq!(categorize_env_var("PORT"), "Application");
        assert_eq!(categorize_env_var("CUSTOM_VAR"), "Application");
    }

    #[test]
    fn test_build_env_template_content() {
        let vars = vec![
            "HOST".to_string(),
            "PORT".to_string(),
            "DB_NAME".to_string(),
            "DB_HOST".to_string(),
            "REDIS_URL".to_string(),
        ];

        let content = build_env_template_content(&vars);

        assert!(content.contains("# Database\n"));
        assert!(content.contains("DB_HOST=\n"));
        assert!(content.contains("DB_NAME=\n"));
        assert!(content.contains("# Cache (Redis)\n"));
        assert!(content.contains("REDIS_URL=\n"));
        assert!(content.contains("# Application\n"));
        assert!(content.contains("HOST=\n"));
        assert!(content.contains("PORT=\n"));

        // Verify category ordering: Database comes before Cache, Cache before Application
        let db_pos = content.find("# Database").unwrap();
        let cache_pos = content.find("# Cache (Redis)").unwrap();
        let app_pos = content.find("# Application").unwrap();
        assert!(db_pos < cache_pos);
        assert!(cache_pos < app_pos);
    }

    #[test]
    fn test_build_env_template_single_category() {
        let vars = vec!["HOST".to_string(), "PORT".to_string()];

        let content = build_env_template_content(&vars);

        assert_eq!(content, "# Application\nHOST=\nPORT=\n");
    }

    #[test]
    fn test_build_env_template_empty() {
        let vars: Vec<String> = vec![];
        let content = build_env_template_content(&vars);
        assert_eq!(content, "");
    }
}
