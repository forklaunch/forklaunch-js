use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use oxc_allocator::Allocator;
use oxc_ast::ast::SourceType;
use oxc_codegen::{Codegen, CodegenOptions};

use crate::{
    constants::{Database, Infrastructure},
    core::ast::{
        deletions::delete_from_test_utils::{
            delete_database_imports_from_test_utils, delete_database_setup_from_test_utils,
            delete_redis_imports_from_test_utils, delete_redis_setup_from_test_utils,
        },
        infrastructure::test_utils::{
            add_database_config_to_test_utils, add_database_imports_to_test_utils,
            add_kafka_env_vars_to_test_utils, add_redis_config_to_test_utils,
            add_redis_imports_to_test_utils, add_s3_env_vars_to_test_utils,
            remove_kafka_env_vars_from_test_utils, remove_s3_env_vars_from_test_utils,
        },
        parse_ast_program::parse_ast_program,
    },
};

pub(crate) fn transform_test_utils_add_database(
    base_path: &Path,
    database: &Database,
) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    add_database_imports_to_test_utils(&allocator, &test_utils_text, &mut test_utils_program)?;
    add_database_config_to_test_utils(&allocator, &mut test_utils_program, database)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_remove_database(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    delete_database_imports_from_test_utils(&allocator, &mut test_utils_program);
    delete_database_setup_from_test_utils(&allocator, &mut test_utils_program);

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_add_redis(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    add_redis_imports_to_test_utils(&allocator, &test_utils_text, &mut test_utils_program)?;
    add_redis_config_to_test_utils(&allocator, &mut test_utils_program)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_remove_redis(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    delete_redis_imports_from_test_utils(&allocator, &mut test_utils_program);

    delete_redis_setup_from_test_utils(&allocator, &mut test_utils_program);

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_add_kafka(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    add_kafka_env_vars_to_test_utils(&allocator, &mut test_utils_program)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_remove_kafka(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    remove_kafka_env_vars_from_test_utils(&allocator, &mut test_utils_program);

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_add_s3(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    add_s3_env_vars_to_test_utils(&allocator, &mut test_utils_program)?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_remove_s3(base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let test_utils_path = base_path.join("__test__").join("test-utils.ts");
    let test_utils_text = read_to_string(&test_utils_path)?;
    let test_utils_type = SourceType::from_path(&test_utils_path)?;

    let mut test_utils_program = parse_ast_program(&allocator, &test_utils_text, test_utils_type);

    remove_s3_env_vars_from_test_utils(&allocator, &mut test_utils_program);

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&test_utils_program)
        .code)
}

pub(crate) fn transform_test_utils_add_infrastructure(
    base_path: &Path,
    infrastructure: &Infrastructure,
) -> Result<String> {
    match infrastructure {
        Infrastructure::Redis => transform_test_utils_add_redis(base_path),
        Infrastructure::S3 => transform_test_utils_add_s3(base_path),
    }
}

pub(crate) fn transform_test_utils_remove_infrastructure(
    base_path: &Path,
    infrastructure: &Infrastructure,
) -> Result<String> {
    match infrastructure {
        Infrastructure::Redis => transform_test_utils_remove_redis(base_path),
        Infrastructure::S3 => transform_test_utils_remove_s3(base_path),
    }
}

#[cfg(test)]
mod tests {
    use std::{
        fs::{create_dir_all, write},
        path::PathBuf,
    };

    use tempfile::TempDir;

    use super::{
        transform_test_utils_add_database, transform_test_utils_add_infrastructure,
        transform_test_utils_add_kafka, transform_test_utils_add_redis,
        transform_test_utils_add_s3, transform_test_utils_remove_database,
        transform_test_utils_remove_infrastructure, transform_test_utils_remove_kafka,
        transform_test_utils_remove_redis, transform_test_utils_remove_s3,
    };
    use crate::constants::{Database, Infrastructure};

    fn create_test_utils_base() -> String {
        r#"import {
  BlueprintTestHarness,
  clearTestDatabase,
  TEST_TOKENS,
  TestSetupResult
} from '@forklaunch/testing';

export { TEST_TOKENS, TestSetupResult };

let harness = new BlueprintTestHarness({
  customEnvVars: {
    PROTOCOL: 'http',
    HOST: 'localhost',
    PORT: '3000'
  }
});

export const setupTestDatabase = async (): Promise<TestSetupResult> => {
  return await harness.setup();
};

export const cleanupTestDatabase = async (): Promise<void> => {
  if (harness) {
    await harness.cleanup();
  }
};

export const clearDatabase = async (): Promise<void> => {
  await clearTestDatabase(undefined as any);
};

export const setupTestData = async () => {
};

export const mockTestData = {
  message: 'Test message'
};
"#
        .to_string()
    }

    fn setup_test_env() -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().unwrap();
        let base_path = temp_dir.path().to_path_buf();
        let test_dir = base_path.join("__test__");
        create_dir_all(&test_dir).unwrap();

        let test_utils_path = test_dir.join("test-utils.ts");
        write(&test_utils_path, create_test_utils_base()).unwrap();

        (temp_dir, base_path)
    }

    #[test]
    fn test_add_database_imports() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_database(&base_path, &Database::PostgreSQL);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();

        assert!(content.contains("EntityManager") && content.contains("MikroORM"));
        assert!(content.contains("@mikro-orm/core"));
    }

    #[test]
    fn test_add_database_config() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_database(&base_path, &Database::PostgreSQL);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();
        assert!(content.contains("getConfig"));
        assert!(content.contains("postgres"));
        assert!(content.contains("databaseType"));
        assert!(content.contains("useMigrations"));
        assert!(content.contains("false"));
    }

    #[test]
    fn test_remove_database() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_database(&base_path, &Database::PostgreSQL);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_remove_database(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(!content.contains("@mikro-orm/core"));
        assert!(!content.contains("getConfig"));
        assert!(!content.contains("databaseType"));
    }

    #[test]
    fn test_add_redis() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_redis(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();
        assert!(content.contains("Redis"));
        assert!(content.contains("ioredis"));
        assert!(content.contains("needsRedis"));
        assert!(content.contains("true"));
        assert!(content.contains("REDIS_URL"));
    }

    #[test]
    fn test_remove_redis() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_redis(&base_path);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_remove_redis(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(!content.contains("ioredis"));
        assert!(!content.contains("needsRedis"));
        assert!(!content.contains("REDIS_URL"));
    }

    #[test]
    fn test_add_kafka_env_vars() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_kafka(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();
        assert!(content.contains("KAFKA_BROKERS"));
        assert!(content.contains("KAFKA_CLIENT_ID"));
        assert!(content.contains("KAFKA_GROUP_ID"));
    }

    #[test]
    fn test_remove_kafka_env_vars() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_kafka(&base_path);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_remove_kafka(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(!content.contains("KAFKA_BROKERS"));
        assert!(!content.contains("KAFKA_CLIENT_ID"));
        assert!(!content.contains("KAFKA_GROUP_ID"));
    }

    #[test]
    fn test_add_s3_env_vars() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_s3(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();
        assert!(content.contains("S3_REGION"));
        assert!(content.contains("S3_ACCESS_KEY_ID"));
        assert!(content.contains("S3_SECRET_ACCESS_KEY"));
        assert!(content.contains("S3_BUCKET"));
        assert!(content.contains("S3_URL"));
    }

    #[test]
    fn test_remove_s3_env_vars() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_s3(&base_path);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_remove_s3(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(!content.contains("S3_REGION"));
        assert!(!content.contains("S3_ACCESS_KEY_ID"));
        assert!(!content.contains("S3_SECRET_ACCESS_KEY"));
        assert!(!content.contains("S3_BUCKET"));
        assert!(!content.contains("S3_URL"));
    }

    #[test]
    fn test_add_infrastructure_redis() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_infrastructure(&base_path, &Infrastructure::Redis);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();
        assert!(content.contains("ioredis"));
        assert!(content.contains("needsRedis"));
    }

    #[test]
    fn test_add_infrastructure_s3() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_infrastructure(&base_path, &Infrastructure::S3);
        assert!(result.is_ok());

        let content = result.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content).unwrap();
        assert!(content.contains("S3_REGION"));
        assert!(content.contains("S3_BUCKET"));
    }

    #[test]
    fn test_remove_infrastructure_redis() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_infrastructure(&base_path, &Infrastructure::Redis);
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_remove_infrastructure(&base_path, &Infrastructure::Redis);
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(!content.contains("ioredis"));
        assert!(!content.contains("needsRedis"));
    }

    #[test]
    fn test_multiple_operations() {
        let (_temp_dir, base_path) = setup_test_env();

        let result = transform_test_utils_add_database(&base_path, &Database::PostgreSQL);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_add_redis(&base_path);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_add_kafka(&base_path);
        assert!(result.is_ok());
        write(
            base_path.join("__test__").join("test-utils.ts"),
            &result.unwrap(),
        )
        .unwrap();

        let result = transform_test_utils_add_s3(&base_path);
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(content.contains("@mikro-orm/core"));
        assert!(content.contains("ioredis"));
        assert!(content.contains("KAFKA_BROKERS"));
        assert!(content.contains("S3_REGION"));
    }

    #[test]
    fn test_idempotent_add() {
        let (_temp_dir, base_path) = setup_test_env();

        let result1 = transform_test_utils_add_redis(&base_path);
        assert!(result1.is_ok());
        let content1 = result1.unwrap();
        write(base_path.join("__test__").join("test-utils.ts"), &content1).unwrap();

        let result2 = transform_test_utils_add_redis(&base_path);
        assert!(result2.is_ok());
        let content2 = result2.unwrap();

        let redis_count1 = content1.matches("needsRedis").count();
        let redis_count2 = content2.matches("needsRedis").count();
        assert_eq!(redis_count1, redis_count2);
    }

    #[test]
    fn test_different_database_types() {
        let (_temp_dir, base_path) = setup_test_env();

        let postgres_result = transform_test_utils_add_database(&base_path, &Database::PostgreSQL);
        assert!(postgres_result.is_ok());
        let content = postgres_result.unwrap();
        assert!(content.contains("postgres") && content.contains("databaseType"));

        let mysql_result = transform_test_utils_add_database(&base_path, &Database::MySQL);
        assert!(mysql_result.is_ok());
        let content = mysql_result.unwrap();
        assert!(content.contains("mysql") && content.contains("databaseType"));

        let mongodb_result = transform_test_utils_add_database(&base_path, &Database::MongoDB);
        assert!(mongodb_result.is_ok());
        let content = mongodb_result.unwrap();
        assert!(content.contains("mongodb") && content.contains("databaseType"));

        let sqlite_result = transform_test_utils_add_database(&base_path, &Database::SQLite);
        assert!(sqlite_result.is_ok());
        let content = sqlite_result.unwrap();
        assert!(content.contains("sqlite") && content.contains("databaseType"));
    }
}
