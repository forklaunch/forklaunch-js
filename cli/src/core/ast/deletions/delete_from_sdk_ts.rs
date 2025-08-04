use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::{Program, Statement, TSType};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use super::delete_import_statement::delete_import_specifier;

pub(crate) fn delete_from_sdk_client_input<'a>(
    allocator: &'a Allocator,
    sdk_program_ast: &mut Program<'a>,
    router_name_camel_case: &str,
) -> Result<String> {
    for stmt in sdk_program_ast.body.iter_mut() {
        let ts_declaration = match stmt {
            Statement::TSTypeAliasDeclaration(ts_decl) => ts_decl,
            _ => continue,
        };

        if !ts_declaration.id.name.contains("SdkClientInput") {
            continue;
        }

        let type_literal = match &mut ts_declaration.type_annotation {
            TSType::TSTypeLiteral(literal) => literal,
            _ => continue,
        };

        let mut indices_to_remove = std::vec::Vec::new();
        for (i, member) in type_literal.members.iter().enumerate() {
            // Use debug format to check if the member contains our router name
            let debug_str = format!("{:?}", member);
            if debug_str.contains(router_name_camel_case) {
                indices_to_remove.push(i);
            }
        }

        for &i in indices_to_remove.iter().rev() {
            type_literal.members.remove(i);
        }
    }

    let _ = delete_import_specifier(
        &allocator,
        sdk_program_ast,
        &format!("{}Routes", router_name_camel_case),
        "./server",
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&sdk_program_ast)
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

        let sdk_code = r#"
        type MySdkClientInput = {
            userRoutes: typeof UserRoutes,
            postRoutes: typeof PostRoutes,
            commentRoutes: typeof CommentRoutes
        };
        "#;
        let mut sdk_program = parse_ast_program(&allocator, sdk_code, SourceType::ts());

        let result =
            delete_from_sdk_client_input(&allocator, &mut sdk_program, "postRoutes");

        assert!(result.is_ok());

        let expected_code = "type MySdkClientInput = {\n\tuserRoutes: typeof UserRoutes\n\tcommentRoutes: typeof CommentRoutes\n};\n";

        assert_eq!(result.unwrap(), expected_code);
    }
}
