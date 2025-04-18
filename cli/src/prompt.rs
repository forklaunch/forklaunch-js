use std::io::Write;

use anyhow::Result;
use clap::ArgMatches;
use rustyline::{
    completion::{Completer, Pair},
    history::DefaultHistory,
    Editor,
};
use rustyline_derive::{Helper, Highlighter, Hinter, Validator};
use termcolor::{Color, ColorSpec, StandardStream, WriteColor};

#[derive(Helper, Hinter, Validator, Highlighter)]
pub(crate) struct ArrayCompleter {
    options: Vec<String>,
}

impl Completer for ArrayCompleter {
    type Candidate = Pair;

    fn complete(
        &self,
        line: &str,
        pos: usize,
        _ctx: &rustyline::Context<'_>,
    ) -> rustyline::Result<(usize, Vec<Pair>)> {
        let current_line = line.split(',').last().unwrap_or(line).trim();
        let matches: Vec<Pair> = self
            .options
            .iter()
            .filter(|option| option.starts_with(current_line))
            .map(|option| Pair {
                display: option.clone(),
                replacement: option.clone(),
            })
            .collect();
        Ok((pos - current_line.len(), matches))
    }
}

pub(crate) fn prompt_without_validation(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches_key: &str,
    matches: &ArgMatches,
    prompt: &str,
) -> Result<String> {
    prompt_with_validation(
        line_editor,
        stdout,
        matches_key,
        matches,
        prompt,
        None,
        |_| true,
        |_| "".to_string(),
    )
}

pub(crate) fn prompt_for_confirmation(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    prompt: &str,
) -> Result<bool> {
    let confirmation = line_editor.readline(prompt)?;
    Ok(confirmation.trim().to_lowercase().starts_with("y"))
}

pub(crate) fn prompt_with_validation<F, V>(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches_key: &str,
    matches: &ArgMatches,
    prompt: &str,
    valid_options: Option<&[&str]>,
    validator: V,
    error_message: F,
) -> Result<String>
where
    F: Fn(&str) -> String,
    V: Fn(&str) -> bool,
{
    loop {
        let input = match matches.get_one::<String>(matches_key) {
            Some(val) => val.to_string(),
            None => {
                if let Some(options) = valid_options {
                    let completer = ArrayCompleter {
                        options: options.iter().map(|&s| s.to_string()).collect(),
                    };
                    line_editor.set_helper(Some(completer));
                    let prompt = if options.is_empty() {
                        prompt.to_string()
                    } else {
                        format!("{} [{}]: ", prompt, options.join(", "))
                    };
                    line_editor.readline(&prompt)?.trim().to_string()
                } else {
                    line_editor.readline(prompt)?.trim().to_string()
                }
            }
        };

        if validator(&input) {
            line_editor.set_helper(None);
            break Ok(input);
        }

        stdout.set_color(ColorSpec::new().set_fg(Some(Color::Red)))?;
        write!(stdout, "{}", error_message(&input))?;
        stdout.reset()?;
        writeln!(stdout)?;
    }
}

pub(crate) fn prompt_comma_separated_list(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    matches_key: &str,
    matches: &ArgMatches,
    valid_options: &[&str],
    prompt_text: &str,
    is_optional: bool,
) -> Result<Vec<String>> {
    match matches.get_many::<String>(matches_key) {
        Some(values) => Ok(values.cloned().collect()),
        None => {
            let completer = ArrayCompleter {
                options: valid_options.iter().map(|&s| s.to_string()).collect(),
            };
            line_editor.set_helper(Some(completer));
            let optional_text = if is_optional { " (optional)" } else { "" };
            let prompt = format!(
                "Enter {} (comma-separated) [{}]{}: ",
                prompt_text,
                valid_options.join(", "),
                optional_text
            );
            let input = line_editor.readline(&prompt)?;
            if input.trim().is_empty() {
                line_editor.set_helper(None);
                Ok(vec![])
            } else {
                Ok(input
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| valid_options.contains(&s.as_str()))
                    .collect::<Vec<String>>()
                    .into_iter()
                    .collect::<std::collections::HashSet<_>>()
                    .into_iter()
                    .collect())
            }
        }
    }
}
