use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::Program;

pub(crate) fn replace_sdk_client_import_sources_generated<'a>(
    _allocator: &'a Allocator,
    _program: &mut Program<'a>,
) -> Result<()> {
    // The /serialized pattern is no longer used
    // In generated mode, imports are already correct - no transformation needed
    Ok(())
}

pub(crate) fn replace_sdk_client_import_sources_live<'a>(
    _allocator: &'a Allocator,
    _program: &mut Program<'a>,
) -> Result<()> {
    // The /serialized pattern is no longer used
    // In live mode, imports are already correct - no transformation needed
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
    fn test_no_rewrite_for_sdkclient_specifiers_after_removing_serialized() {
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

        // After removing /serialized, imports should remain unchanged
        let expected = "import { BillingSdkClient } from \"@forklaunch/blueprint-billing-base\";\nimport { IamSdkClient as AuthClient } from \"@forklaunch/blueprint-iam-base\";\nimport { universalSdk } from \"@forklaunch/universal-sdk\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_no_rewrite_for_namespace_and_default_imports() {
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

        // After removing /serialized, imports should remain unchanged
        let expected = "import * as Clients from \"@acme/sdk\";\nimport DefaultSdkClient from \"@acme/other\";\nimport { SomethingElse } from \"@acme/not-sdk\";\n";

        assert_eq!(generated, expected);
    }

    #[test]
    fn test_no_rewrite_for_live_mode() {
        let allocator = Allocator::default();

        let input = r#"
        import { BillingSdkClient } from '@forklaunch/blueprint-billing-base';
        import { IamSdkClient as AuthClient } from '@forklaunch/blueprint-iam-base';
        import { universalSdk } from '@forklaunch/universal-sdk';
        "#;

        let mut program = parse_ast_program(&allocator, input, SourceType::ts());

        let result = replace_sdk_client_import_sources_live(&allocator, &mut program);
        assert!(result.is_ok());

        let generated = Codegen::new()
            .with_options(CodegenOptions::default())
            .build(&program)
            .code;

        // Live mode should leave imports unchanged
        let expected = "import { BillingSdkClient } from \"@forklaunch/blueprint-billing-base\";\nimport { IamSdkClient as AuthClient } from \"@forklaunch/blueprint-iam-base\";\nimport { universalSdk } from \"@forklaunch/universal-sdk\";\n";

        assert_eq!(generated, expected);
    }
}
