use anyhow::{Result, bail};
use oxc_ast::ast::{Declaration, Program, Statement, TSType};

pub(crate) fn inject_into_sdk_types_client_input<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
) -> Result<()> {
    for stmt in app_program_ast.body.iter_mut() {
        let ts_declaration = match stmt {
            Statement::TSTypeAliasDeclaration(export) => export,
            _ => continue,
        };

        if !ts_declaration.id.name.contains("SdkClientInput") {
            continue;
        }

        let app_object_type = match &mut ts_declaration.type_annotation {
            TSType::TSTypeLiteral(type_literal) => type_literal,
            _ => continue,
        };

        for injection_stmt in &mut injection_program_ast.body {
            let export = match injection_stmt {
                Statement::ExportNamedDeclaration(export) => export,
                _ => continue,
            };

            let ts_decl = match &mut export.declaration {
                Some(Declaration::TSTypeAliasDeclaration(ts_decl)) => ts_decl,
                _ => continue,
            };

            let injection_object_type = match &mut ts_decl.type_annotation {
                TSType::TSTypeLiteral(type_literal) => type_literal,
                _ => continue,
            };

            // Merge the properties from injection into app
            app_object_type
                .members
                .extend(injection_object_type.members.drain(..));
            return Ok(());
        }
    }

    bail!("Failed to inject into export declaration");
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;
    use oxc_codegen::{CodeGenerator, CodegenOptions};

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    #[test]
    fn test_successful_injection() {
        let allocator = Allocator::default();

        let app_code = r#"
        export type MySdkClientInput = {
            mySdkClientRoutes: typeof MySdkClientRoutes
        };
        "#;
        let mut app_program = parse_ast_program(&allocator, app_code, SourceType::ts());

        let injection_code = r#"
        export type MySdkClientInput = {
            mySdkClient2Routes: typeof MySdkClient2Routes
        };
        "#;
        let mut injection_program = parse_ast_program(&allocator, injection_code, SourceType::ts());

        let result = inject_into_sdk_types_client_input(&mut app_program, &mut injection_program);

        assert!(result.is_ok());

        let expected_code = "export type MySdkClientInput = {\n\tmySdkClientRoutes: typeof MySdkClientRoutes\n\tmySdkClient2Routes: typeof MySdkClient2Routes\n};\n";

        assert_eq!(
            CodeGenerator::new()
                .with_options(CodegenOptions::default())
                .build(&app_program)
                .code,
            expected_code
        );
    }
}
