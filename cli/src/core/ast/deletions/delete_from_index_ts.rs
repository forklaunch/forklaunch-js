use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{Program, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

pub(crate) fn delete_from_index_ts_export<'a>(
    allocator: &'a Allocator,
    index_program: &mut Program<'a>,
    export_identifier: &str,
) -> Result<String> {
    let mut new_body = Vec::new_in(allocator);
    index_program.body.iter().for_each(|stmt| {
        let expr = match stmt {
            Statement::ExportNamedDeclaration(expr) => expr,
            _ => {
                new_body.push(stmt.clone_in(allocator));
                return;
            }
        };

        if let Some(source) = &expr.source {
            if source.value.as_str() == export_identifier {
                return;
            }
        }

        new_body.push(stmt.clone_in(allocator));
    });

    index_program.body = new_body;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&index_program)
        .code)
}
