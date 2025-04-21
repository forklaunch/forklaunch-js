use anyhow::{bail, Result};
use oxc_ast::ast::{Expression, Program, Statement};

pub(crate) fn inject_into_app_ts<'a, F>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
    app_ts_injection_pos: F,
) -> Result<()>
where
    F: Fn(&oxc_allocator::Vec<'a, Statement>) -> Option<usize>,
{
    for stmt in &mut app_program_ast.body {
        let expr = match stmt {
            Statement::ExpressionStatement(expr) => expr,
            _ => continue,
        };

        let call = match &mut expr.expression {
            Expression::CallExpression(call) => call,
            _ => continue,
        };

        for arg in &mut call.arguments {
            let arrow = match arg.as_expression_mut() {
                Some(Expression::ArrowFunctionExpression(arrow)) => arrow,
                _ => continue,
            };

            let splice_pos = match app_ts_injection_pos(&arrow.body.statements) {
                Some(pos) => pos,
                None => continue,
            };

            for stmt in injection_program_ast.body.drain(..).rev() {
                arrow.body.statements.insert(splice_pos, stmt);
            }

            return Ok(());
        }
    }

    bail!("Failed to inject into app.ts")
}
