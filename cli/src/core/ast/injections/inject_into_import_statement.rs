use std::borrow::Cow;

use anyhow::{bail, Result};
use oxc_ast::ast::{Program, Statement};

pub(crate) fn inject_into_import_statement<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    import_source_identifier: &str,
    import_name_identifier: &str,
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

            if !import.source.value.contains(import_source_identifier) {
                return;
            }

            let specifiers = match &import.specifiers {
                Some(specifiers) => specifiers,
                None => return,
            };

            if specifiers.len() == 1
                && specifiers.first().unwrap().name() > Cow::Borrowed(import_name_identifier)
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
