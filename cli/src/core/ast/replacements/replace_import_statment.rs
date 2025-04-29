use anyhow::{bail, Result};
use oxc_ast::ast::{Program, Statement};

pub(crate) fn replace_import_statment<'a>(
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

            if import.source.value.as_str() == import_source_identifier {
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
        let splice_values = injection_program_ast.body.drain(..);
        app_program_ast
            .body
            .splice(index..index + splice_values.len(), splice_values);

        Ok(())
    } else {
        bail!("Failed to inject into import statement")
    }
}
