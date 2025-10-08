use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::{Program, SourceType};

use crate::{
    constants::Database,
    core::ast::{
        injections::inject_into_test_utils::{
            inject_into_test_harness_custom_env_vars, inject_into_test_harness_options,
        },
        parse_ast_program::parse_ast_program,
        replacements::replace_import_statment::replace_import_statment,
    },
};

pub(crate) fn add_database_imports_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_text: &str,
    test_utils_program: &mut Program<'a>,
) -> Result<()> {
    if !test_utils_text.contains("import { EntityManager, MikroORM } from '@mikro-orm/core';") {
        let import_text = "import { EntityManager, MikroORM } from '@mikro-orm/core';";
        let mut import_program = parse_ast_program(&allocator, import_text, SourceType::ts());

        replace_import_statment(test_utils_program, &mut import_program, "@mikro-orm/core")?;
    }

    Ok(())
}

pub(crate) fn add_redis_imports_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_text: &str,
    test_utils_program: &mut Program<'a>,
) -> Result<()> {
    if !test_utils_text.contains("import Redis from 'ioredis';") {
        let import_text = "import Redis from 'ioredis';";
        let mut import_program = parse_ast_program(&allocator, import_text, SourceType::ts());

        replace_import_statment(test_utils_program, &mut import_program, "ioredis")?;
    }

    Ok(())
}

pub(crate) fn add_database_config_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
    database: &Database,
) -> Result<()> {
    let database_type = match database {
        Database::PostgreSQL => "postgres",
        Database::MySQL | Database::MariaDB => "mysql",
        Database::MsSQL => "mssql",
        Database::MongoDB => "mongodb",
        Database::LibSQL | Database::SQLite | Database::BetterSQLite => "sqlite",
    };

    let get_config_text = "const harness = new BlueprintTestHarness({
            getConfig: async () => {
                const { default: config } = await import('../mikro-orm.config');
                return config;
            }
        });";
    let mut get_config_program = parse_ast_program(&allocator, get_config_text, SourceType::ts());

    inject_into_test_harness_options(
        &allocator,
        test_utils_program,
        &mut get_config_program,
        "getConfig",
    )?;

    let database_type_value = allocator.alloc_str(database_type);
    let database_type_text = allocator.alloc_str(&format!(
        "const harness = new BlueprintTestHarness({{
            databaseType: '{}'
        }});",
        database_type_value
    ));
    let mut database_type_program =
        parse_ast_program(&allocator, database_type_text, SourceType::ts());

    inject_into_test_harness_options(
        &allocator,
        test_utils_program,
        &mut database_type_program,
        "databaseType",
    )?;

    let use_migrations_text = "const harness = new BlueprintTestHarness({
        useMigrations: false
    });";
    let mut use_migrations_program =
        parse_ast_program(&allocator, use_migrations_text, SourceType::ts());

    inject_into_test_harness_options(
        &allocator,
        test_utils_program,
        &mut use_migrations_program,
        "useMigrations",
    )?;

    Ok(())
}

pub(crate) fn add_redis_config_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) -> Result<()> {
    let needs_redis_text = "const harness = new BlueprintTestHarness({
        needsRedis: true
    });";
    let mut needs_redis_program = parse_ast_program(&allocator, needs_redis_text, SourceType::ts());

    inject_into_test_harness_options(
        &allocator,
        test_utils_program,
        &mut needs_redis_program,
        "needsRedis",
    )?;

    let redis_url_text = "const harness = new BlueprintTestHarness({
        customEnvVars: {
            REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
        }
    });";
    let mut redis_url_program = parse_ast_program(&allocator, redis_url_text, SourceType::ts());

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut redis_url_program,
        "REDIS_URL",
    )?;

    Ok(())
}

pub(crate) fn add_kafka_env_vars_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) -> Result<()> {
    let needs_kafka_text = "const harness = new BlueprintTestHarness({
        needsKafka: true
    });";
    let mut needs_kafka_program = parse_ast_program(&allocator, needs_kafka_text, SourceType::ts());

    inject_into_test_harness_options(
        &allocator,
        test_utils_program,
        &mut needs_kafka_program,
        "needsKafka",
    )?;

    Ok(())
}

pub(crate) fn add_s3_env_vars_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) -> Result<()> {
    let needs_s3_text = "const harness = new BlueprintTestHarness({
        needsS3: true
    });";
    let mut needs_s3_program = parse_ast_program(&allocator, needs_s3_text, SourceType::ts());

    inject_into_test_harness_options(
        &allocator,
        test_utils_program,
        &mut needs_s3_program,
        "needsS3",
    )?;

    Ok(())
}

pub(crate) fn remove_kafka_env_vars_from_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) {
    use crate::core::ast::deletions::delete_from_test_utils::delete_from_test_harness_options;

    let _ = delete_from_test_harness_options(allocator, test_utils_program, "needsKafka");
}

pub(crate) fn remove_s3_env_vars_from_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) {
    use crate::core::ast::deletions::delete_from_test_utils::delete_from_test_harness_options;

    let _ = delete_from_test_harness_options(allocator, test_utils_program, "needsS3");
}
