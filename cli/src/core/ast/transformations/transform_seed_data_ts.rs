use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    injections::inject_into_import_statement::inject_into_import_statement,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_seed_data_ts(
    router_name: &str,
    is_worker: bool,
    base_path: &String,
) -> Result<String> {
    let allocator = Allocator::default();
    let seed_data_path = Path::new(base_path)
        .join("persistence")
        .join("seed.data.ts");
    let seed_data_source_text = read_to_string(&seed_data_path).unwrap();
    let seed_data_source_type = SourceType::from_path(&seed_data_path).unwrap();
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut seed_data_program =
        parse_ast_program(&allocator, &seed_data_source_text, seed_data_source_type);

    let seed_data_import_text = format!(
        "import {{ {router_name_pascal_case}Record }} from './entities/{router_name_camel_case}Record.entity';",
    );
    let mut seed_data_import_injection =
        parse_ast_program(&allocator, &seed_data_import_text, seed_data_source_type);

    inject_into_import_statement(
        &mut seed_data_program,
        &mut seed_data_import_injection,
        format!("./entities/{router_name_camel_case}Record.entity").as_str(),
        // "/entities/",
        // format!("{router_name_pascal_case}Record").as_str(),
    )?;

    let seed_data_text = format!(
        "export const {router_name_camel_case}Record = {router_name_pascal_case}Record.create({{
            message: 'Test message'{}
        }})",
        if is_worker {
            ",
            processed: false,
            retryCount: 0
            "
        } else {
            ""
        }
    );

    let mut seed_data_injection = parse_ast_program(&allocator, &seed_data_text, SourceType::ts());

    seed_data_program
        .body
        .extend(seed_data_injection.body.drain(..));

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&seed_data_program)
        .code)
}
