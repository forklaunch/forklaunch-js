use anyhow::{Result, bail};
use oxc_ast::ast::{Declaration, Program, Statement, TSType};

pub(crate) fn inject_into_exported_sdk_client<'a>(
    app_program_ast: &mut Program<'a>,
    injection_program_ast: &mut Program<'a>,
) -> Result<()> {
    for stmt in app_program_ast.body.iter_mut() {
        let export = match stmt {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        let ts_declaration = match &mut export.declaration {
            Some(Declaration::TSTypeAliasDeclaration(ts_decl)) => ts_decl,
            _ => continue,
        };

        if !ts_declaration.id.name.contains("SdkClient") {
            continue;
        }

        let type_reference = match &mut ts_declaration.type_annotation {
            TSType::TSTypeReference(type_ref) => type_ref,
            _ => continue,
        };

        let inner_sdk_tuple = match type_reference
            .type_parameters
            .as_mut()
            .and_then(|tp| tp.params.iter_mut().find(|_| true))
        {
            Some(TSType::TSTupleType(tuple)) => tuple,
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

            let injection_tuple = match &mut ts_decl.type_annotation {
                TSType::TSTupleType(tuple) => Some(tuple),
                TSType::TSTypeReference(type_ref) => {
                    if let Some(type_params) = type_ref.type_parameters.as_mut() {
                        type_params.params.iter_mut().find_map(|param| match param {
                            TSType::TSTupleType(tuple) => Some(tuple),
                            _ => None,
                        })
                    } else {
                        None
                    }
                }
                _ => None,
            };

            if let Some(tuple) = injection_tuple {
                inner_sdk_tuple
                    .element_types
                    .extend(tuple.element_types.drain(..));
                return Ok(());
            }
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
export type MySdkClient = SdkClient<[
    typeof MySdkClientRoutes
]>;
"#;
        let mut app_program = parse_ast_program(&allocator, app_code, SourceType::ts());

        let injection_code = r#"
export type SdkClient = SdkClient<[
    typeof MySdkClient2Routes
]>;
"#;
        let mut injection_program = parse_ast_program(&allocator, injection_code, SourceType::ts());

        let result = inject_into_exported_sdk_client(&mut app_program, &mut injection_program);

        assert!(result.is_ok());

        let expected_code = "export type MySdkClient = SdkClient<[typeof MySdkClientRoutes, typeof MySdkClient2Routes]>;\n";

        assert_eq!(
            CodeGenerator::new()
                .with_options(CodegenOptions::default())
                .build(&app_program)
                .code,
            expected_code
        );
    }
}
