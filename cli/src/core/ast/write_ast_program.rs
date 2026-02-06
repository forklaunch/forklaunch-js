use oxc_codegen::{Codegen, CodegenOptions};

pub(crate) fn write_ast_program(program: &oxc_ast::ast::Program<'_>) -> String {
    Codegen::new()
        .with_options(CodegenOptions::default())
        .build(program)
        .code
}
