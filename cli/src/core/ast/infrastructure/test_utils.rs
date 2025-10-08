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
    let kafka_env_text = "const harness = new BlueprintTestHarness({
        customEnvVars: {
            KAFKA_BROKERS: 'localhost:9092',
            KAFKA_CLIENT_ID: 'test-client',
            KAFKA_GROUP_ID: 'test-group'
        }
    });";
    let mut kafka_env_program = parse_ast_program(&allocator, kafka_env_text, SourceType::ts());

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut kafka_env_program,
        "KAFKA_BROKERS",
    )?;

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut kafka_env_program,
        "KAFKA_CLIENT_ID",
    )?;

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut kafka_env_program,
        "KAFKA_GROUP_ID",
    )?;

    Ok(())
}

pub(crate) fn add_s3_env_vars_to_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) -> Result<()> {
    let s3_env_text = "const harness = new BlueprintTestHarness({
        customEnvVars: {
            S3_REGION: 'us-east-1',
            S3_ACCESS_KEY_ID: 'test-access-key',
            S3_SECRET_ACCESS_KEY: 'test-secret-key',
            S3_BUCKET: 'test-bucket',
            S3_URL: 'http://localhost:9000'
        }
    });";
    let mut s3_env_program = parse_ast_program(&allocator, s3_env_text, SourceType::ts());

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut s3_env_program,
        "S3_REGION",
    )?;

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut s3_env_program,
        "S3_ACCESS_KEY_ID",
    )?;

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut s3_env_program,
        "S3_SECRET_ACCESS_KEY",
    )?;

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut s3_env_program,
        "S3_BUCKET",
    )?;

    inject_into_test_harness_custom_env_vars(
        &allocator,
        test_utils_program,
        &mut s3_env_program,
        "S3_URL",
    )?;

    Ok(())
}

pub(crate) fn remove_kafka_env_vars_from_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) {
    use crate::core::ast::deletions::delete_from_test_utils::delete_from_test_harness_custom_env_vars;

    let _ =
        delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "KAFKA_BROKERS");
    let _ =
        delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "KAFKA_CLIENT_ID");
    let _ =
        delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "KAFKA_GROUP_ID");
}

pub(crate) fn remove_s3_env_vars_from_test_utils<'a>(
    allocator: &'a Allocator,
    test_utils_program: &mut Program<'a>,
) {
    use crate::core::ast::deletions::delete_from_test_utils::delete_from_test_harness_custom_env_vars;

    let _ = delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "S3_REGION");
    let _ =
        delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "S3_ACCESS_KEY_ID");
    let _ = delete_from_test_harness_custom_env_vars(
        allocator,
        test_utils_program,
        "S3_SECRET_ACCESS_KEY",
    );
    let _ = delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "S3_BUCKET");
    let _ = delete_from_test_harness_custom_env_vars(allocator, test_utils_program, "S3_URL");
}
