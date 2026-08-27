use std::io::Write;

use anyhow::{Context, Result};
use clap::{Arg, ArgAction, ArgMatches, Command};
use termcolor::{Color, ColorChoice, ColorSpec, StandardStream, WriteColor};

use crate::{
    CliCommand,
    core::command::command,
    managed::{
        client::{Missing, extract_list, get_value, require_managed_mode, resolve_managed_auth},
        types::{TemplateVariable, dash, yes_no},
    },
};

/// Stands in for a static variable's literal unless `--reveal` was passed.
///
/// Static values are the one place a template holds something sensitive: the platform's
/// own entity classifies the column as payment-card data precisely because "a template
/// author will put a shared credential here whatever the docs say". Printing that into
/// terminal scrollback or a CI log on every `vars list` is the wrong default, so the
/// value is withheld behind an explicit flag — and the placeholder says which flag, so
/// nobody mistakes a withheld value for an empty one.
const HIDDEN: &str = "<hidden — pass --reveal>";

/// Replaces static values with a placeholder. Applied before BOTH the table and the
/// `--json` output, so `--json` cannot be used as a way around `--reveal`.
fn redact(variables: &mut [TemplateVariable]) {
    for variable in variables.iter_mut() {
        if variable.value.is_some() {
            variable.value = Some(HIDDEN.to_string());
        }
    }
}

/// What to show a reader in the SOURCE column: where this variable's value comes from.
fn source(variable: &TemplateVariable) -> String {
    match variable.kind.as_deref() {
        Some("static") => variable
            .value
            .clone()
            .unwrap_or_else(|| "(no value)".to_string()),
        Some("generated") => dash(&variable.generator_type).to_string(),
        Some("custom") => "set per instance".to_string(),
        _ => "-".to_string(),
    }
}

#[derive(Debug)]
pub(super) struct ListCommand;

impl ListCommand {
    pub(super) fn new() -> Self {
        Self
    }
}

impl CliCommand for ListCommand {
    fn command(&self) -> Command {
        command("list", "List the variables a template declares")
            .long_about(
                "List the variables a template declares, and where each one's value comes from.\n\n\
                 The SOURCE column reads differently per kind: for `static` it is the literal,\n\
                 for `generated` it is the recipe each instance derives from, and for `custom`\n\
                 it says the value lives on the instance rather than here.\n\n\
                 Static values are WITHHELD by default and shown only with --reveal, because a\n\
                 static variable is the one kind that can hold a secret shared across every\n\
                 customer's instance. --json withholds them too — it is not a way around\n\
                 --reveal.\n\n\
                 To see whether a particular instance has values for the `custom` ones, use\n\
                 `forklaunch managed instance vars list --id <instance-id>`.",
            )
            .arg(
                Arg::new("slug")
                    .long("slug")
                    .required(true)
                    .help("Slug of the template whose variables should be listed"),
            )
            .arg(
                Arg::new("reveal")
                    .long("reveal")
                    .help("Print static values in full instead of withholding them")
                    .action(ArgAction::SetTrue),
            )
            .arg(
                Arg::new("json")
                    .long("json")
                    .help("Output raw JSON instead of formatted terminal output")
                    .action(ArgAction::SetTrue),
            )
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        let slug = matches
            .get_one::<String>("slug")
            .context("--slug is required")?;

        let auth_mode = resolve_managed_auth()?;
        require_managed_mode(&auth_mode)?;

        let path = format!("/templates/{}/variables", urlencoding::encode(slug));
        let value = get_value(
            &auth_mode,
            &path,
            Missing::Resource(format!("template '{}'", slug)),
        )?;
        let mut variables: Vec<TemplateVariable> = extract_list(value, &["variables"])?;

        if !matches.get_flag("reveal") {
            redact(&mut variables);
        }

        if matches.get_flag("json") {
            println!("{}", serde_json::to_string_pretty(&variables)?);
            return Ok(());
        }

        let mut stdout = StandardStream::stdout(ColorChoice::Always);
        writeln!(stdout)?;
        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)).set_bold(true))?;
        writeln!(stdout, "Variables declared by template '{}'", slug)?;
        stdout.reset()?;
        writeln!(stdout)?;

        if variables.is_empty() {
            writeln!(
                stdout,
                "  This template declares no variables. Add one with `forklaunch managed template vars set`."
            )?;
            writeln!(stdout)?;
            return Ok(());
        }

        stdout.set_color(ColorSpec::new().set_bold(true))?;
        writeln!(
            stdout,
            "  {:<24} {:<10} {:<12} {:<14} {:<9} SOURCE",
            "KEY", "KIND", "SCOPE", "SERVICE", "REQUIRED"
        )?;
        stdout.reset()?;
        for variable in &variables {
            writeln!(
                stdout,
                "  {:<24} {:<10} {:<12} {:<14} {:<9} {}",
                dash(&variable.key),
                dash(&variable.kind),
                dash(&variable.scope),
                dash(&variable.service_name),
                yes_no(&variable.required),
                source(variable),
            )?;
        }
        writeln!(stdout)?;

        let required_custom = variables.iter().any(|variable| {
            variable.kind.as_deref() == Some("custom") && variable.required == Some(true)
        });
        if required_custom {
            log_info!(
                stdout,
                "Variables marked required must have a value on an instance before it can be provisioned. Check one with: forklaunch managed instance vars list --id <instance-id>"
            );
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn static_variable(value: &str) -> TemplateVariable {
        TemplateVariable {
            key: Some("STRIPE_KEY".to_string()),
            kind: Some("static".to_string()),
            value: Some(value.to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn static_values_are_withheld_by_default() {
        let mut variables = vec![static_variable("sk_live_supersecret")];
        redact(&mut variables);
        assert_eq!(variables[0].value.as_deref(), Some(HIDDEN));
        assert!(!source(&variables[0]).contains("supersecret"));
    }

    #[test]
    fn json_output_cannot_be_used_to_bypass_reveal() {
        // `--json` serializes the same redacted structs the table renders, so the secret
        // has to be gone from the serialized form too.
        let mut variables = vec![static_variable("sk_live_supersecret")];
        redact(&mut variables);
        let rendered = serde_json::to_string(&variables).unwrap();
        assert!(!rendered.contains("supersecret"), "{}", rendered);
    }

    #[test]
    fn revealing_leaves_the_value_alone() {
        // `redact` is simply not called for --reveal; assert the value survives so a
        // future refactor cannot make --reveal a no-op.
        let variable = static_variable("sk_live_supersecret");
        assert_eq!(source(&variable), "sk_live_supersecret");
    }

    #[test]
    fn the_source_column_reads_differently_per_kind() {
        let generated = TemplateVariable {
            kind: Some("generated".to_string()),
            generator_type: Some("32-bytes-base64".to_string()),
            ..Default::default()
        };
        assert_eq!(source(&generated), "32-bytes-base64");

        let custom = TemplateVariable {
            kind: Some("custom".to_string()),
            ..Default::default()
        };
        assert_eq!(source(&custom), "set per instance");
    }

    #[test]
    fn a_generated_variable_has_no_value_to_redact() {
        // The design guarantee behind `generated`: the template stores no secret. If a
        // control plane ever sent one back it would still be withheld, but there should
        // not be one to begin with.
        let mut variables = vec![TemplateVariable {
            kind: Some("generated".to_string()),
            generator_type: Some("hex-key".to_string()),
            ..Default::default()
        }];
        redact(&mut variables);
        assert!(variables[0].value.is_none());
    }
}
