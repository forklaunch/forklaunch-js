use anyhow::Result;
use oxc_ast::ast::{Program, Statement};

pub(crate) fn inject_export_into_index_ts<'a>(
    entities_index_program: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<()> {
    let mut maybe_splice_pos = None;

    entities_index_program
        .body
        .iter()
        .enumerate()
        .for_each(|(index, stmt)| {
            let expr = match stmt {
                Statement::ExportNamedDeclaration(expr) => expr,
                _ => return,
            };

            if let Some(source) = &expr.source {
                if source.value.as_str() <= router_name_camel_case {
                    maybe_splice_pos = Some(index);
                }
            }
        });

    if let Some(splice_pos) = maybe_splice_pos {
        for stmt in injection_program_ast.body.drain(..).rev() {
            entities_index_program.body.insert(splice_pos, stmt);
        }
    }

    Ok(())
}
