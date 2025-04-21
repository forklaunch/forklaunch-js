use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::{SourceType, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::parse_ast_program::parse_ast_program;

pub(crate) fn transform_core_registration_validator_ts(
    validator_name: &str,
    base_path: &Path,
) -> Result<String> {
    let allocator = Allocator::default();
    let core_registration_validator_path = base_path.join("core").join("registration.ts");
    let core_registration_validator_text = read_to_string(&core_registration_validator_path)?;
    let core_registration_validator_type =
        SourceType::from_path(&core_registration_validator_path)?;

    let mut core_registration_validator_program = parse_ast_program(
        &allocator,
        &core_registration_validator_text,
        core_registration_validator_type,
    );

    core_registration_validator_program
        .body
        .iter_mut()
        .enumerate()
        .for_each(|(_, stmt)| {
            let import = match stmt {
                Statement::ImportDeclaration(import) => import,
                _ => return,
            };
            if !import.source.value.contains("@forklaunch/validator/") {
                let _ = import.source.value.replace(
                    r".*",
                    format!("@forklaunch/validator/{}", validator_name).as_str(),
                );
            }
        });

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&core_registration_validator_program)
        .code)
}
