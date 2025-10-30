use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    injections::inject_into_index_ts::inject_into_index_ts_export,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_seeders_index_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let seeders_index_path = base_path
        .join("persistence")
        .join("seeders")
        .join("index.ts");
    let seeders_index_source_text = read_to_string(&seeders_index_path).unwrap();
    let seeders_index_source_type = SourceType::from_path(&seeders_index_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut seeders_index_program = parse_ast_program(
        &allocator,
        &seeders_index_source_text,
        seeders_index_source_type,
    );

    let seeders_index_text = format!(
        "export {{ {router_name_pascal_case}RecordSeeder }} from './{router_name_camel_case}Record.seeder';",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &seeders_index_text, SourceType::ts());

    inject_into_index_ts_export(
        &mut seeders_index_program,
        &mut injection_program_ast,
        &router_name_camel_case,
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&seeders_index_program)
        .code)
}

#[cfg(test)]
mod tests {
    use std::fs::{create_dir_all, write};

    use tempfile::TempDir;

    use super::*;

    fn create_test_seeders_index() -> &'static str {
        r#"export { UserRecordSeeder } from './userRecord.seeder';
export { RoleRecordSeeder } from './roleRecord.seeder';
"#
    }

    fn create_temp_seeders_structure(content: &str) -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        create_dir_all(temp_path.join("persistence/seeders"))
            .expect("Failed to create persistence/seeders directory");

        write(temp_path.join("persistence/seeders/index.ts"), content)
            .expect("Failed to write index.ts");

        temp_dir
    }

    #[test]
    fn test_transform_seeders_index_adds_export() {
        let content = create_test_seeders_index();
        let temp_dir = create_temp_seeders_structure(content);
        let temp_path = temp_dir.path();

        let result = transform_seeders_index_ts("product", temp_path);

        assert!(result.is_ok());

        let transformed = result.unwrap();

        assert!(transformed.contains("export { ProductRecordSeeder }"));
        assert!(transformed.contains("from \"./productRecord.seeder\""));

        assert!(transformed.contains("export { UserRecordSeeder }"));
        assert!(transformed.contains("export { RoleRecordSeeder }"));
    }

    #[test]
    fn test_transform_seeders_index_kebab_case() {
        let content = create_test_seeders_index();
        let temp_dir = create_temp_seeders_structure(content);
        let temp_path = temp_dir.path();

        let result = transform_seeders_index_ts("order-item", temp_path);

        assert!(result.is_ok());

        let transformed = result.unwrap();

        assert!(transformed.contains("export { OrderItemRecordSeeder }"));
        assert!(transformed.contains("from \"./orderItemRecord.seeder\""));
    }

    #[test]
    fn test_transform_seeders_index_empty_file() {
        let content = "";
        let temp_dir = create_temp_seeders_structure(content);
        let temp_path = temp_dir.path();

        let result = transform_seeders_index_ts("category", temp_path);

        assert!(result.is_ok());

        let transformed = result.unwrap();

        assert!(transformed.contains("export { CategoryRecordSeeder }"));
        assert!(transformed.contains("from \"./categoryRecord.seeder\""));
    }
}
