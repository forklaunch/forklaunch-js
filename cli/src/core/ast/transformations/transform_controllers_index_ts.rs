use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    deletions::delete_from_index_ts::delete_from_index_ts_export,
    injections::inject_into_index_ts::inject_into_index_ts_export,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_controllers_index_ts(
    router_name: &str,
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();
    let controllers_index_path = base_path.join("api").join("controllers").join("index.ts");
    let controllers_index_source_text = read_to_string(&controllers_index_path).unwrap();
    let controllers_index_source_type = SourceType::from_path(&controllers_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);

    let mut controllers_index_program = parse_ast_program(
        &allocator,
        &controllers_index_source_text,
        controllers_index_source_type,
    );

    let controllers_index_text = format!("export * from './{router_name_camel_case}.controller';",);
    let mut injection_program_ast =
        parse_ast_program(&allocator, &controllers_index_text, SourceType::ts());

    inject_into_index_ts_export(
        &mut controllers_index_program,
        &mut injection_program_ast,
        &router_name_camel_case,
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&controllers_index_program)
        .code)
}

pub(crate) fn transform_controllers_index_ts_delete(
    router_name: &str,
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();
    let controllers_index_path = base_path.join("api").join("controllers").join("index.ts");
    let controllers_index_source_text = read_to_string(&controllers_index_path).unwrap();
    let controllers_index_source_type = SourceType::from_path(&controllers_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);

    let mut controllers_index_program = parse_ast_program(
        &allocator,
        &controllers_index_source_text,
        controllers_index_source_type,
    );

    delete_from_index_ts_export(
        &allocator,
        &mut controllers_index_program,
        &format!("./{}.controller", router_name_camel_case).as_str(),
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&controllers_index_program)
        .code)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir_all, write};
    use tempfile::TempDir;

    fn create_test_controllers_index() -> &'static str {
        r#"export * from './user.controller';
export * from './role.controller';
"#
    }

    fn create_temp_controllers_structure(content: &str) -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        create_dir_all(temp_path.join("api/controllers"))
            .expect("Failed to create api/controllers directory");

        write(temp_path.join("api/controllers/index.ts"), content)
            .expect("Failed to write index.ts");

        temp_dir
    }

    #[test]
    fn test_transform_controllers_index_adds_export() {
        let content = create_test_controllers_index();
        let temp_dir = create_temp_controllers_structure(content);
        let temp_path = temp_dir.path();

        let result = transform_controllers_index_ts("product", temp_path);

        assert!(result.is_ok());

        let transformed = result.unwrap();

        assert!(transformed.contains("export * from \"./product.controller\";"));
        assert!(transformed.contains("export * from \"./user.controller\";"));
        assert!(transformed.contains("export * from \"./role.controller\";"));
    }

    #[test]
    fn test_transform_controllers_index_kebab_case() {
        let content = create_test_controllers_index();
        let temp_dir = create_temp_controllers_structure(content);
        let temp_path = temp_dir.path();

        let result = transform_controllers_index_ts("order-item", temp_path);

        assert!(result.is_ok());

        let transformed = result.unwrap();

        assert!(transformed.contains("export * from \"./orderItem.controller\";"));
    }

    #[test]
    fn test_transform_controllers_index_delete() {
        let content = r#"export * from './user.controller';
export * from './product.controller';
export * from './role.controller';
"#;
        let temp_dir = create_temp_controllers_structure(content);
        let temp_path = temp_dir.path();

        let result = transform_controllers_index_ts_delete("product", temp_path);

        assert!(result.is_ok());

        let transformed = result.unwrap();

        assert!(!transformed.contains("export * from \"./product.controller\";"));
        assert!(transformed.contains("export * from \"./user.controller\";"));
        assert!(transformed.contains("export * from \"./role.controller\";"));
    }
}
