use std::io::Write;

use anyhow::Result;
use clap::{Arg, ArgAction, ArgMatches, Command};
use serde::Serialize;
use termcolor::{Color, ColorChoice, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::{
        ast::infrastructure::env::find_all_env_vars,
        command::command,
        env::{find_workspace_root, get_modules_path, is_env_var_defined},
        env_scope::{determine_env_var_scopes, is_pulumi_injected},
        rendered_template::RenderedTemplatesCache,
    },
};

/// Why a variable does or does not need a value from a person.
///
/// The order these are tested in is the order the deploy gate tests them, so a
/// variable reported here as needing nobody is one the gate also skips.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub(crate) enum Classification {
    /// The platform injects this at deploy time.
    PlatformManaged,
    /// A value is already present in a local .env file.
    Set,
    /// The application declares it `optional(...)`, so it may be left unset.
    DeclaredOptional,
    /// Nothing exempts it — a person has to supply this.
    NeedsValue,
}

impl Classification {
    fn label(self) -> &'static str {
        match self {
            Self::PlatformManaged => "platform-managed",
            Self::Set => "set",
            Self::DeclaredOptional => "optional",
            Self::NeedsValue => "needs a value",
        }
    }

    /// The gate's question: does a person still have to supply this?
    pub(crate) fn needs_person(self) -> bool {
        matches!(self, Self::NeedsValue)
    }

    fn colour(self) -> Color {
        match self {
            Self::NeedsValue => Color::Yellow,
            Self::Set => Color::Green,
            _ => Color::Cyan,
        }
    }
}

#[derive(Debug, Serialize)]
pub(crate) struct VariableStatus {
    pub key: String,
    pub project: String,
    pub classification: Classification,
    /// Declared optionality as the scanner read it. Absent when no sighting
    /// carried a declared type.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub optional: Option<bool>,
    pub needs_value: bool,
}

/// Decide what a variable's status is.
///
/// Kept separate from the handler so the rule can be tested without a
/// filesystem. The order mirrors the platform's: ownership first, then a stored
/// value, then declared optionality. Ownership leads because a variable the
/// platform injects is nobody's task whatever the application declared about
/// it — reporting it optional would imply someone could usefully set it.
pub(crate) fn classify(
    platform_injected: bool,
    has_value: bool,
    optional: Option<bool>,
) -> Classification {
    if platform_injected {
        Classification::PlatformManaged
    } else if has_value {
        Classification::Set
    } else if optional == Some(true) {
        Classification::DeclaredOptional
    } else {
        Classification::NeedsValue
    }
}

#[derive(Debug)]
pub(crate) struct StatusCommand;

impl StatusCommand {
    pub(crate) fn new() -> Self {
        Self
    }
}

impl CliCommand for StatusCommand {
    fn command(&self) -> Command {
        command(
            "status",
            "Report which environment variables still need a value from a person",
        )
        .long_about(
            "Scans the workspace, classifies every environment variable it finds, and reports \
             which ones still need someone to supply a value.\n\n\
             Exits non-zero while anything needs input, so CI and agents can gate on it without \
             parsing the output.",
        )
        .arg(
            Arg::new("base_path")
                .short('p')
                .long("path")
                .help("The application path to report status for"),
        )
        .arg(
            Arg::new("json")
                .long("json")
                .help("Emit machine-readable JSON instead of a table")
                .action(ArgAction::SetTrue),
        )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        let json_output = matches.get_flag("json");

        let (app_root, manifest) = crate::core::validate::require_manifest(matches)?;
        let workspace_root = find_workspace_root(&app_root)?;
        let modules_path = get_modules_path(&workspace_root)?;

        let cache = RenderedTemplatesCache::new();
        let project_env_vars = find_all_env_vars(&modules_path, &cache)?;

        // Scoped vars are the right unit: optionality is already folded across
        // every project that uses a name, so a variable required anywhere is
        // reported required here.
        let scoped = determine_env_var_scopes(&project_env_vars, &manifest)?;
        let project_names: Vec<String> = project_env_vars.keys().cloned().collect();

        let mut statuses: Vec<VariableStatus> = Vec::new();

        for var in &scoped {
            let owning_project = var
                .used_by
                .first()
                .cloned()
                .unwrap_or_else(|| "application".to_string());
            let project_path = modules_path.join(&owning_project);

            // Precedence mirrors the platform's: ownership first, then a stored
            // value, then declared optionality. A variable the platform injects
            // is nobody's task whatever the code declared about it.
            let classification = classify(
                is_pulumi_injected(&var.name, &project_names),
                var.value.is_some()
                    || is_env_var_defined(&project_path, &var.name).unwrap_or(false),
                var.optional,
            );

            statuses.push(VariableStatus {
                key: var.name.clone(),
                project: owning_project,
                classification,
                optional: var.optional,
                needs_value: classification.needs_person(),
            });
        }

        statuses.sort_by(|a, b| (&a.project, &a.key).cmp(&(&b.project, &b.key)));
        let outstanding = statuses.iter().filter(|s| s.needs_value).count();

        if json_output {
            writeln!(stdout, "{}", serde_json::to_string_pretty(&statuses)?)?;
        } else {
            render_table(&mut stdout, &statuses)?;
        }

        // Non-zero while anything needs input, so CI and agents can gate on the
        // exit code rather than parsing output.
        if outstanding > 0 {
            std::process::exit(1);
        }

        Ok(())
    }
}

fn render_table(stdout: &mut StandardStream, statuses: &[VariableStatus]) -> Result<()> {
    if statuses.is_empty() {
        writeln!(stdout, "No environment variables found.")?;
        return Ok(());
    }

    let width = statuses
        .iter()
        .map(|s| s.key.len())
        .max()
        .unwrap_or(3)
        .max(3);

    writeln!(stdout, "\n{:<width$}  STATUS", "KEY", width = width)?;

    for status in statuses {
        write!(stdout, "{:<width$}  ", status.key, width = width)?;
        stdout
            .set_color(termcolor::ColorSpec::new().set_fg(Some(status.classification.colour())))?;
        write!(stdout, "{}", status.classification.label())?;
        stdout.reset()?;
        writeln!(stdout, "   ({})", status.project)?;
    }

    let outstanding = statuses.iter().filter(|s| s.needs_value).count();
    writeln!(
        stdout,
        "\n{} variables · {} need a value",
        statuses.len(),
        outstanding
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platform_ownership_wins_over_everything() {
        // A variable the platform injects is nobody's task, whatever the
        // application declared or whether a local value happens to exist.
        for has_value in [true, false] {
            for optional in [None, Some(true), Some(false)] {
                assert_eq!(
                    classify(true, has_value, optional),
                    Classification::PlatformManaged
                );
            }
        }
    }

    #[test]
    fn a_stored_value_settles_it() {
        assert_eq!(classify(false, true, None), Classification::Set);
        assert_eq!(classify(false, true, Some(false)), Classification::Set);
    }

    #[test]
    fn declared_optional_needs_nobody_when_unset() {
        assert_eq!(
            classify(false, false, Some(true)),
            Classification::DeclaredOptional
        );
    }

    #[test]
    fn undeclared_and_unset_needs_a_person() {
        // Absent optionality means no sighting carried a declared type, which
        // this design refuses to read as optional.
        assert_eq!(classify(false, false, None), Classification::NeedsValue);
        assert_eq!(
            classify(false, false, Some(false)),
            Classification::NeedsValue
        );
    }

    #[test]
    fn only_needs_value_is_reported_as_needing_a_person() {
        // The exit code and the agent's work list both key off this, so it is
        // the one mapping that must not drift.
        assert!(!Classification::PlatformManaged.needs_person());
        assert!(!Classification::Set.needs_person());
        assert!(!Classification::DeclaredOptional.needs_person());
        assert!(Classification::NeedsValue.needs_person());
    }
}
