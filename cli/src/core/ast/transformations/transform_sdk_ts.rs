use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    injections::{
        inject_into_import_statement::{
            inject_into_import_statement, inject_specifier_into_import_statement,
        },
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

    let controllers_import_source = "./api/controllers";
    let spec_get = format!("{}Get", router_name_camel_case);
    let spec_post = format!("{}Post", router_name_camel_case);
    let try_inject_get = inject_specifier_into_import_statement(
        &allocator,
        &mut sdk_program,
        &spec_get,
        controllers_import_source,
    );
    let try_inject_post = inject_specifier_into_import_statement(
        &allocator,
        &mut sdk_program,
        &spec_post,
        controllers_import_source,
    );
    if try_inject_get.is_err() || try_inject_post.is_err() {
        let controllers_import_text =
            format!("import {{ {spec_get}, {spec_post} }} from '{controllers_import_source}';");
        let mut controllers_import_program = parse_ast_program(
            &allocator,
            allocator.alloc_str(&controllers_import_text),
            sdk_source_type,
        );
        inject_into_import_statement(
            &mut sdk_program,
            &mut controllers_import_program,
            controllers_import_source,
            &sdk_source_text,
        )?;
    }

    let sdk_injection_text = format!(
        r#"
        export type TestSdk = {{
            {router_name_camel_case}: {{
                {spec_get}: typeof {spec_get};
                {spec_post}: typeof {spec_post};
            }};
        }};
        export const injectedSdkClient = {{ {router_name_camel_case}: {{ {spec_get}: {spec_get}, {spec_post}: {spec_post} }} }}
        "#
    );
    let mut injected_sdk_skeleton =
        parse_ast_program(&allocator, &sdk_injection_text, sdk_source_type);

    inject_into_sdk_client_input(&mut sdk_program, &mut injected_sdk_skeleton)?;

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
import { SchemaValidator } from "@forklaunch/core";
import { MapToSdk } from '@forklaunch/core/http';
import { svcGet } from "./api/controllers";

export type TestSvcSdk = {
  svc: {
    svcGet: typeof svcGet;
  };
};

export const svcSdkClient = {
  svc: {
    svcGet: svcGet
  }
} satisfies TestSvcSdk;
"#;

        let temp_dir = create_temp_project_structure(sdk_content);
        let project_path = temp_dir.path().join("test-project");

        let result = transform_sdk_ts("userManagement", &project_path);

        assert!(result.is_ok());

        let transformed_code = result.unwrap();
        assert!(transformed_code.contains(
            "import { svcGet, userManagementGet, userManagementPost } from \"./api/controllers\""
        ));
        assert!(transformed_code.contains("userManagement:"));
        assert!(transformed_code.contains("userManagementGet"));
        assert!(transformed_code.contains("userManagementPost"));

        let normalized_result = transformed_code
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<&str>>()
            .join("\n");

        assert!(normalized_result.contains(
            "import { svcGet, userManagementGet, userManagementPost } from \"./api/controllers\""
        ));
    }
}
