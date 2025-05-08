use std::borrow::Cow;

use anyhow::{Result, bail};
use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{Program, SourceType, Statement};

use crate::core::ast::parse_ast_program::parse_ast_program;

pub(crate) fn inject_into_import_statement<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    import_source_identifier: &str,
) -> Result<()> {
    let mut injection_pos = None;
    let mut found_import = false;

    app_program_ast
        .body
        .iter()
        .enumerate()
        .for_each(|(index, stmt)| {
            let import = match stmt {
                Statement::ImportDeclaration(import) => import,
                _ => return,
            };

            if Cow::Borrowed(import.source.value.as_str()) > Cow::Borrowed(import_source_identifier)
            {
                found_import = true;
                if injection_pos.is_none() {
                    injection_pos = Some(index);
                }
                return;
            }

            if !found_import {
                injection_pos = Some(index + 1);
            }
        });

    if let Some(index) = injection_pos {
        for stmt in injection_program_ast.body.drain(..).rev() {
            app_program_ast.body.insert(index, stmt);
        }
        Ok(())
    } else {
        bail!("Failed to inject into import statement")
    }
}

pub(crate) fn inject_specifier_into_import_statement<'a>(
    allocator: &'a Allocator,
    app_program_ast: &mut Program<'a>,
    specifier: &str,
    import_source_identifier: &str,
) -> Result<()> {
    let inject_import_text = format!(
        "import {{ {} }} from '{}';",
        specifier, import_source_identifier
    );
    let mut inject_import_program =
        parse_ast_program(allocator, &inject_import_text, SourceType::ts());
    let mut found_import = false;

    app_program_ast.body.iter_mut().for_each(|stmt| {
        let import = match stmt {
            Statement::ImportDeclaration(import) => import,
            _ => return,
        };

        if Cow::Borrowed(import.source.value.as_str()) == Cow::Borrowed(import_source_identifier) {
            found_import = true;
            if import.specifiers.is_some() {
                let inject_import = match inject_import_program.body.first_mut().unwrap() {
                    Statement::ImportDeclaration(import) => import,
                    _ => return,
                };
                let specifier = inject_import.specifiers.as_ref().unwrap().first().unwrap();
                if !import
                    .specifiers
                    .as_ref()
                    .unwrap()
                    .iter()
                    .map(|s| s.name())
                    .collect::<Vec<_>>()
                    .contains(&specifier.name())
                {
                    import
                        .specifiers
                        .as_mut()
                        .unwrap()
                        .push(specifier.clone_in(allocator));
                }
            };
        }
    });

    if !found_import {
        bail!("Failed to inject into import statement");
    }

    Ok(())
}
