use oxc_allocator::Allocator;
use oxc_ast::ast::{Program, SourceType};
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
