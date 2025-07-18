use anyhow::Result;
use oxc_ast::ast::{Declaration, Program, Statement, TSType};
use oxc_codegen::{CodeGenerator, CodegenOptions};

pub(crate) fn delete_from_sdk_types_client_input<'a>(
    server_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<String> {
    for stmt in server_program_ast.body.iter_mut() {
        let export = match stmt {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let ts_declaration = match &mut export.declaration {
            Some(Declaration::TSTypeAliasDeclaration(ts_decl)) => ts_decl,
            _ => continue,
        };

        if !ts_declaration.id.name.contains("SdkClientInput") {
            continue;
        }

        // Handle object type literal (TSTypeLiteral) instead of type reference
        let type_literal = match &mut ts_declaration.type_annotation {
            TSType::TSTypeLiteral(literal) => literal,
            _ => continue,
        };

        // Simple string-based matching approach
        let mut indices_to_remove = std::vec::Vec::new();
        for (i, member) in type_literal.members.iter().enumerate() {
            // Use debug format to check if the member contains our router name
            let debug_str = format!("{:?}", member);
            if debug_str.contains(router_name_camel_case) {
                indices_to_remove.push(i);
            }
        }

        // Remove elements in reverse order to maintain correct indices
        for &i in indices_to_remove.iter().rev() {
            type_literal.members.remove(i);
        }
    }

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&server_program_ast)
        .code)
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    #[test]
    fn test_successful_deletion() {
        let allocator = Allocator::default();

        let server_code = r#"
        export type MySdkClientInput = {
            userRoutes: typeof UserRoutes,
            postRoutes: typeof PostRoutes,
            commentRoutes: typeof CommentRoutes
        };
        "#;
        let mut server_program = parse_ast_program(&allocator, server_code, SourceType::ts());

        let result = delete_from_sdk_types_client_input(&mut server_program, "postRoutes");

        assert!(result.is_ok());

        let expected_code = "export type MySdkClientInput = {\n\tuserRoutes: typeof UserRoutes\n\tcommentRoutes: typeof CommentRoutes\n};\n";

        assert_eq!(result.unwrap(), expected_code);
    }
}
