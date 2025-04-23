use std::io::Write;

use anyhow::Result;
use clap::ArgMatches;
use dialoguer::{theme::ColorfulTheme, FuzzySelect, Input, MultiSelect};
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

pub(crate) fn prompt_with_validation<ErrorFunction, ValidatorFunction>(
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches_key: &str,
    matches: &ArgMatches,
    prompt: &str,
    valid_options: Option<&[&str]>,
    validator: ValidatorFunction,
    error_message: ErrorFunction,
) -> Result<String>
where
    ErrorFunction: Fn(&str) -> String,
    ValidatorFunction: Fn(&str) -> bool,
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
                        format!("Enter {}: ", prompt)
                    } else {
                        format!("Enter {} [{}]: ", prompt, options.join(", "))
                    };
                    options[FuzzySelect::with_theme(&ColorfulTheme::default())
                        .with_prompt(prompt)
                        .items(options)
                        .default(0)
                        .interact()
                        .unwrap()]
                    .to_string()
                } else {
                    Input::with_theme(&ColorfulTheme::default())
                        .with_prompt(prompt)
                        .validate_with({
                            |input: &String| -> Result<(), String> {
                                if validator(input) {
                                    Ok(())
                                } else {
                                    Err(error_message(input))
                                }
                            }
                        })
                        .interact_text()
                        .unwrap()
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
            let input: Vec<String> = MultiSelect::with_theme(&ColorfulTheme::default())
                .with_prompt(prompt)
                .items(valid_options)
                .interact()
                .unwrap()
                .into_iter()
                .map(|index| valid_options[index].to_string())
                .collect();

            Ok(input)
        }
    }
}

pub(crate) fn prompt_field_from_selections_with_validation(
    field_name: &str,
    current_value: Option<&String>,
    selected_options: &[&str],
    line_editor: &mut Editor<ArrayCompleter, DefaultHistory>,
    stdout: &mut StandardStream,
    matches: &clap::ArgMatches,
    prompt: &str,
    valid_values: Option<&[&str]>,
    validator: impl Fn(&str) -> bool,
    error_msg: impl Fn(&str) -> String,
) -> Result<Option<String>> {
    if current_value.is_none() && selected_options.contains(&field_name) {
        Ok(Some(prompt_with_validation(
            line_editor,
            stdout,
            field_name,
            matches,
            prompt,
            valid_values,
            validator,
            error_msg,
        )?))
    } else {
        Ok(current_value.map(|v| v.to_string()))
    }
}
