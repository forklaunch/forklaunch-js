use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn, Vec};
use oxc_ast::ast::{Program, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

pub(crate) fn delete_import_statement<'a>(
    allocator: &'a Allocator,
    app_program_ast: &mut Program<'a>,
    import_source_identifier: &str,
) -> Result<String> {
    let mut new_body = Vec::new_in(allocator);
    app_program_ast.body.iter().for_each(|stmt| {
        let import = match stmt {
            Statement::ImportDeclaration(import) => import,
            _ => {
                new_body.push(stmt.clone_in(allocator));
                return;
            }
        };

        if import.source.value.as_str() != import_source_identifier {
            new_body.push(stmt.clone_in(allocator));
        }
    });

    app_program_ast.body = new_body;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(app_program_ast)
        .code)
}
