use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{Expression, Program, SourceType, Statement};
use oxc_parser::Parser;

pub(crate) fn parse_ast_program<'a>(
    allocator: &'a Allocator,
    source_text: &'a str,
    source_type: SourceType,
) -> Program<'a> {
    Parser::new(allocator, source_text, source_type)
        .parse()
        .program
}

pub(crate) fn parse_ast_expression<'a>(
    allocator: &'a Allocator,
    source_text: &'a str,
    source_type: SourceType,
) -> Option<Expression<'a>> {
    let program = parse_ast_program(allocator, source_text, source_type);
    let statement = &program.body[0];
    let variable_declaration = match statement {
        Statement::VariableDeclaration(decl) => decl,
        _ => return None,
    };
    variable_declaration.declarations[0]
        .init
        .clone_in(allocator)
}
