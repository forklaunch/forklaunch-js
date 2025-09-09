use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    injections::{
        inject_into_import_statement::inject_into_import_statement,
        inject_into_sdk::inject_into_sdk_client_input,
    },
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_sdk_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let sdk_path = base_path.join("sdk.ts");
    let sdk_source_text = read_to_string(&sdk_path).unwrap();
    let sdk_source_type = SourceType::from_path(&sdk_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);

    let mut sdk_program = parse_ast_program(&allocator, &sdk_source_text, sdk_source_type);

    let sdk_router_import_text = format!(
        "import {{ {router_name_camel_case}SdkRouter }} from './api/routes/{router_name_camel_case}.routes';"
    );
    let mut sdk_router_import_injection =
        parse_ast_program(&allocator, &sdk_router_import_text, sdk_source_type);
    inject_into_import_statement(
        &mut sdk_program,
        &mut sdk_router_import_injection,
        "./server",
        &sdk_source_text,
    )?;

    let sdk_client_skeleton_text = format!(
        "export const sdkClient = sdkClient(schemaValidator, {{ {router_name_camel_case}: {router_name_camel_case}SdkRouter }})"
    );
    let mut injected_sdk_client_skeleton =
        parse_ast_program(&allocator, &sdk_client_skeleton_text, sdk_source_type);

    inject_into_sdk_client_input(&mut sdk_program, &mut injected_sdk_client_skeleton)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&sdk_program)
        .code)
}

#[cfg(test)]
mod tests {
    use std::fs::{create_dir_all, write};

    use tempfile::TempDir;

    use super::*;

    fn create_temp_project_structure(sdk_content: &str) -> TempDir {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path().join("test-project");
        create_dir_all(&project_path).unwrap();

        write(project_path.join("sdk.ts"), sdk_content).unwrap();

        temp_dir
    }

    #[test]
    fn test_transform_sdk_ts() {
        let sdk_content = r#"
import { schemaValidator } from '@forklaunch/core';

export const sdkClient = sdkClient(schemaValidator, {
    // Existing SDK routes
});
"#;

        let temp_dir = create_temp_project_structure(sdk_content);
        let project_path = temp_dir.path().join("test-project");

        let result = transform_sdk_ts("userManagement", &project_path);

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        let expected_content = r#"import { userManagementSdkRouter } from "./api/routes/userManagement.routes";
import { schemaValidator } from "@forklaunch/core";
export const sdkClient = sdkClient(schemaValidator, { userManagement: userManagementSdkRouter });"#;

        // Normalize both strings by removing empty lines and trimming
        let normalized_result = transformed_code
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<&str>>()
            .join("\n");

        let normalized_expected = expected_content
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<&str>>()
            .join("\n");

        assert_eq!(normalized_result, normalized_expected);
    }
}
