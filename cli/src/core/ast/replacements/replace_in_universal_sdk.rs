use anyhow::Result;
use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{ImportDeclarationSpecifier, Program, SourceType, Statement};

pub(crate) fn replace_sdk_client_import_sources_generated<'a>(
    allocator: &'a Allocator,
    program: &mut Program<'a>,
) -> Result<()> {
    for stmt in program.body.iter_mut() {
        let import_decl = match stmt {
            Statement::ImportDeclaration(import_decl) => import_decl,
            _ => continue,
        };

        let mut has_sdkclient = false;
        let mut default_import: Option<String> = None;
        let mut namespace_import: Option<String> = None;
        let mut named_imports: Vec<String> = Vec::new();

        if let Some(specifiers) = &import_decl.specifiers {
            for spec in specifiers.iter() {
                match spec {
                    ImportDeclarationSpecifier::ImportSpecifier(s) => {
                        let imported = s.imported.name();
                        let local = s.local.name.as_str();
                        if imported.ends_with("SdkClient") || local.ends_with("SdkClient") {
                            has_sdkclient = true;
                        }
                        if imported == local {
                            named_imports.push(imported.to_string());
                        } else {
                            named_imports.push(format!("{} as {}", imported, local));
                        }
                    }
                    ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                        let local = s.local.name.as_str();
                        if local.ends_with("SdkClient") {
                            has_sdkclient = true;
                        }
                        default_import = Some(local.to_string());
                    }
                    ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                        let local = s.local.name.as_str();
                        if local.ends_with("SdkClient") {
                            has_sdkclient = true;
                        }
                        namespace_import = Some(local.to_string());
                    }
                }
            }
        }

        if !has_sdkclient {
            continue;
        }

        let original_source = import_decl.source.value.as_str();
        if original_source.ends_with("/serialized") {
            continue;
        }
        let new_source = format!("{}/serialized", original_source);

        let replacement_text = if let Some(ns) = namespace_import {
            format!("import * as {} from '{}';", ns, new_source)
        } else {
            let mut parts: Vec<String> = Vec::new();
            if let Some(def_) = default_import {
                parts.push(def_);
            }
            if !named_imports.is_empty() {
                parts.push(format!("{{ {} }}", named_imports.join(", ")));
            }
            let left = parts.join(", ");
            format!("import {} from '{}';", left, new_source)
        };

        let replacement_program = crate::core::ast::parse_ast_program::parse_ast_program(
            allocator,
            allocator.alloc_str(&replacement_text),
            SourceType::ts(),
        );
        if let Some(Statement::ImportDeclaration(new_import)) = replacement_program.body.first() {
            *stmt = Statement::ImportDeclaration(new_import.clone_in(allocator));
        }
    }

    Ok(())
}

pub(crate) fn replace_sdk_client_import_sources_live<'a>(
    allocator: &'a Allocator,
    program: &mut Program<'a>,
) -> Result<()> {
    for stmt in program.body.iter_mut() {
        let import_decl = match stmt {
            Statement::ImportDeclaration(import_decl) => import_decl,
            _ => continue,
        };

        let mut has_sdkclient = false;
        let mut default_import: Option<String> = None;
        let mut namespace_import: Option<String> = None;
        let mut named_imports: Vec<String> = Vec::new();

        if let Some(specifiers) = &import_decl.specifiers {
            for spec in specifiers.iter() {
                match spec {
                    ImportDeclarationSpecifier::ImportSpecifier(s) => {
                        let imported = s.imported.name();
                        let local = s.local.name.as_str();
                        if imported.ends_with("SdkClient") || local.ends_with("SdkClient") {
                            has_sdkclient = true;
                        }
                        if imported == local {
                            named_imports.push(imported.to_string());
                        } else {
                            named_imports.push(format!("{} as {}", imported, local));
                        }
                    }
                    ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                        let local = s.local.name.as_str();
                        if local.ends_with("SdkClient") {
                            has_sdkclient = true;
                        }
                        default_import = Some(local.to_string());
                    }
                    ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                        let local = s.local.name.as_str();
                        if local.ends_with("SdkClient") {
                            has_sdkclient = true;
                        }
                        namespace_import = Some(local.to_string());
                    }
                }
            }
        }

        if !has_sdkclient {
            continue;
        }

        let original_source = import_decl.source.value.as_str();
        let new_source = match original_source.strip_suffix("/serialized") {
            Some(base) => base.to_string(),
            None => original_source.to_string(),
        };

        if new_source == original_source {
            continue;
        }

        let replacement_text = if let Some(ns) = namespace_import {
            format!("import * as {} from '{}';", ns, new_source)
        } else {
            let mut parts: Vec<String> = Vec::new();
            if let Some(def_) = default_import {
                parts.push(def_);
            }
            if !named_imports.is_empty() {
                parts.push(format!("{{ {} }}", named_imports.join(", ")));
            }
            let left = parts.join(", ");
            format!("import {} from '{}';", left, new_source)
        };

        let replacement_program = crate::core::ast::parse_ast_program::parse_ast_program(
            allocator,
            allocator.alloc_str(&replacement_text),
            SourceType::ts(),
        );
        if let Some(Statement::ImportDeclaration(new_import)) = replacement_program.body.first() {
            *stmt = Statement::ImportDeclaration(new_import.clone_in(allocator));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;
    use oxc_codegen::{Codegen, CodegenOptions};

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    #[test]
    fn test_rewrite_import_sources_with_sdkclient_specifiers() {
        let allocator = Allocator::default();

        let input = r#"
        import { BillingSdkClient } from '@forklaunch/blueprint-billing-base';
        import { IamSdkClient as AuthClient } from '@forklaunch/blueprint-iam-base';
        import { universalSdk } from '@forklaunch/universal-sdk';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_generated(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected = "import { BillingSdkClient } from \"@forklaunch/blueprint-billing-base/serialized\";\nimport { IamSdkClient as AuthClient } from \"@forklaunch/blueprint-iam-base/serialized\";\nimport { universalSdk } from \"@forklaunch/universal-sdk\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_namespace_and_default_imports_preserved_and_rewritten() {
        let allocator = Allocator::default();

        let input = r#"
        import * as Clients from '@acme/sdk';
        import DefaultSdkClient from '@acme/other';
        import { SomethingElse } from '@acme/not-sdk';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_generated(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected = "import * as Clients from \"@acme/sdk\";\nimport DefaultSdkClient from \"@acme/other/serialized\";\nimport { SomethingElse } from \"@acme/not-sdk\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_live_reverts_generated_suffix_for_named_and_aliased() {
        let allocator = Allocator::default();

        let input = r#"
        import { BillingSdkClient } from '@forklaunch/blueprint-billing-base/serialized';
        import { IamSdkClient as AuthClient } from '@forklaunch/blueprint-iam-base/serialized';
        import { universalSdk } from '@forklaunch/universal-sdk';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_live(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected = "import { BillingSdkClient } from \"@forklaunch/blueprint-billing-base\";\nimport { IamSdkClient as AuthClient } from \"@forklaunch/blueprint-iam-base\";\nimport { universalSdk } from \"@forklaunch/universal-sdk\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_live_reverts_generated_suffix_for_default_and_skips_unrelated() {
        let allocator = Allocator::default();

        let input = r#"
        import DefaultSdkClient from '@acme/other/serialized';
        import * as Clients from '@acme/sdk';
        import { SomethingElse } from '@acme/not-sdk';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_live(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected = "import DefaultSdkClient from \"@acme/other\";\nimport * as Clients from \"@acme/sdk\";\nimport { SomethingElse } from \"@acme/not-sdk\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_namespace_alias_named_sdkclient_triggers_generated_rewrite() {
        let allocator = Allocator::default();

        let input = r#"
        import * as ClientsSdkClient from '@acme/sdk';
        import { Foo } from '@acme/other';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_generated(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected = "import * as ClientsSdkClient from \"@acme/sdk/serialized\";\nimport { Foo } from \"@acme/other\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_mixed_named_imports_generated_rewrite_once() {
        let allocator = Allocator::default();

        let input = r#"
        import { BillingSdkClient, SomethingElse } from '@forklaunch/billing';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_generated(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected =
            "import { BillingSdkClient, SomethingElse } from \"@forklaunch/billing/serialized\";\n";
        assert_eq!(generated, expected);

        let result_again = replace_sdk_client_import_sources_generated(&allocator, &mut program);
        assert!(result_again.is_ok());
        let generated_again = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;
        assert_eq!(generated_again, expected);
    }

    #[test]
    fn test_live_reverts_namespace_alias_with_sdkclient() {
        let allocator = Allocator::default();

        let input = r#"
        import * as ClientsSdkClient from '@acme/sdk/serialized';
        import { Foo } from '@acme/other';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_live(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        let expected = "import * as ClientsSdkClient from \"@acme/sdk\";\nimport { Foo } from \"@acme/other\";\n";
        assert_eq!(generated, expected);
    }
}
