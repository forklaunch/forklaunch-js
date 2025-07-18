use anyhow::{Result, bail};
use oxc_ast::ast::{Program, Statement};

pub(crate) fn inject_into_server_ts<'a, F>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    app_ts_injection_pos: F,
) -> Result<()>
where
    F: Fn(&oxc_allocator::Vec<'a, Statement>) -> Option<usize>,
{
    let splice_pos = match app_ts_injection_pos(&app_program_ast.body) {
        Some(pos) => pos,
        None => bail!("Failed to delete from server.ts"),
    };

    for stmt in injection_program_ast.body.drain(..).rev() {
        app_program_ast.body.insert(splice_pos, stmt);
    }

    Ok(())
}
