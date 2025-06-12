use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::{SourceType, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    parse_ast_program::parse_ast_program,
    replacements::replace_import_statment::replace_import_statment,
};

pub(crate) fn transform_core_registrations_ts_http_framework<'a>(
    http_framework_name: &str,
    existing_http_framework_name: &str,
    base_path: &Path,
    core_registration_http_framework_text: Option<String>,
) -> Result<String> {
    let allocator = Allocator::default();
    let core_registration_http_framework_path = base_path.join("core").join("registrations.ts");
    let core_registration_http_framework_text = if let Some(core_registration_http_framework_text) =
        core_registration_http_framework_text
    {
        core_registration_http_framework_text
    } else {
        read_to_string(&core_registration_http_framework_path)?
    };
    let core_registration_http_framework_type =
        SourceType::from_path(&core_registration_http_framework_path)?;

    let mut core_registration_http_framework_program = parse_ast_program(
        &allocator,
        &core_registration_http_framework_text,
        core_registration_http_framework_type,
    );

    let import_to_replace = core_registration_http_framework_program
        .body
        .iter_mut()
        .enumerate()
        .find_map(|(_, stmt)| {
            let import = match stmt {
                Statement::ImportDeclaration(import) => import,
                _ => return None,
            };

            if import
                .source
                .value
                .contains(&format!("@forklaunch/{}", existing_http_framework_name).as_str())
            {
                println!("{:?}", import);
                return Some(import.source.value.clone());
            }

            None
            // if HttpFramework::VARIANTS.iter().any(|framework| {
            //     import
            //         .source
            //         .value
            //         .contains(format!("@forklaunch/{}", framework).as_str())
            // }) {
            //     return Some((
            //         import.source.to_string(),
            //         import
            //             .source
            //             .value
            //             .to_string()
            //             .replace(&import.source.to_string(), http_framework_name),
            //     ));
            // } else {
            //     None
            // }
        })
        .unwrap();
    println!("import_to_replace: {:?}", import_to_replace);
    replace_import_statment(
        &mut core_registration_http_framework_program,
        &mut parse_ast_program(
            &allocator,
            allocator.alloc_str(
                &import_to_replace.replace(existing_http_framework_name, http_framework_name),
            ),
            SourceType::ts(),
        ),
        &format!("@forklaunch/{}", existing_http_framework_name),
    )?;

    // println!("{:?}", http_frameworks_to_replace);
    // http_frameworks_to_replace.for_each(|framework: (String, String)| {
    //     let cursor = &mut cursor.clone_in(&allocator);
    //     let _ = replace_import_statment(
    //         cursor,
    //         &mut parse_ast_program(
    //             &allocator,
    //             allocator.alloc_str(&framework.1),
    //             SourceType::ts(),
    //         ),
    //         &framework.0,
    //     );
    // });

    println!(
        "{:?}",
        CodeGenerator::new()
            .with_options(CodegenOptions::default())
            .build(&core_registration_http_framework_program)
            .code
    );
    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&core_registration_http_framework_program)
        .code)
}

pub(crate) fn transform_core_registrations_ts_validator(
    validator_name: &str,
    base_path: &Path,
    core_registration_validator_text: Option<String>,
) -> Result<String> {
    let allocator = Allocator::default();
    let core_registration_validator_path = base_path.join("core").join("registrations.ts");
    let core_registration_validator_text =
        if let Some(core_registration_validator_text) = core_registration_validator_text {
            core_registration_validator_text
        } else {
            read_to_string(&core_registration_validator_path)?
        };
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
