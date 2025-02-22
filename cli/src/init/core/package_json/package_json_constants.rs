// Application package.json dependencies constants
pub(crate) const GLOBALS_VERSION: &str = "^15.14.0";
pub(crate) const HUSKY_VERSION: &str = "^9.1.7";
pub(crate) const JEST_TYPES_VERSION: &str = "^29.5.14";
pub(crate) const JEST_VERSION: &str = "^29.7.0";
pub(crate) const LINT_STAGED_VERSION: &str = "^15.3.0";
pub(crate) const SORT_PACKAGE_JSON_VERSION: &str = "^2.12.0";
pub(crate) const TS_JEST_VERSION: &str = "^29.2.5";
pub(crate) const TSX_VERSION: &str = "^4.19.2";
pub(crate) const TYPESCRIPT_VERSION: &str = "^5.7.3";
pub(crate) const VITEST_VERSION: &str = "^2.1.8";

// Application package.json scripts constants
pub(crate) const APP_DEV_SCRIPT: &str = "docker compose up";
pub(crate) const APP_DEV_BUILD_SCRIPT: &str = "docker compose up --build";
pub(crate) const APP_FORMAT_SCRIPT: &str =
    "prettier --ignore-path=.prettierignore --config .prettierrc '**/*.{ts,tsx,json}' --write";
pub(crate) const APP_LINT_SCRIPT: &str = "eslint . -c eslint.config.mjs";
pub(crate) const APP_LINT_FIX_SCRIPT: &str = "eslint . -c eslint.config.mjs --fix";
pub(crate) const APP_PREPARE_SCRIPT: &str = "husky";

pub(crate) fn application_build_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "bun --filter='*' run build",
        "node" => "pnpm -r run build",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn application_clean_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "rm -rf node_modules bun.lockb && bun -r clean",
        "node" => {
            "rm -rf node_modules pnpm-lock.yaml && pnpm --parallel -r clean && pnpm store prune"
        }
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn application_clean_purge_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "bun run clean",
        "node" => "pnpm run clean && pnpm store clear",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn application_docs_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "bun --filter='*' docs",
        "node" => "pnpm --parallel -r run docs",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn application_migrate_script(
    runtime: &str,
    database: &str,
    migration_suffix: &str,
) -> String {
    let package_manager = match runtime {
        "bun" => "bun --filter='*'",
        "node" => "pnpm -r",
        _ => panic!("Unsupported runtime"),
    };

    let db_init = match database {
        "mongodb" => "-d mongo-init",
        _ => "",
    };

    let sleep = if migration_suffix == "init" {
        "sleep 5 && "
    } else {
        ""
    };

    format!(
        "docker compose up -d {} {} && {}{} run migrate:{}",
        database, db_init, sleep, package_manager, migration_suffix
    )
}
pub(crate) fn application_test_script<'a>(runtime: &'a str, test_framework: &'a str) -> &'a str {
    match runtime {
        "bun" => "bun test",
        "node" => match test_framework {
            "jest" => "pnpm jest --passWithNoTests",
            "vitest" => "pnpm vitest --passWithNoTests",
            _ => panic!("Unsupported test framework"),
        },
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn application_up_packages_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "bun update --latest",
        "node" => "pnpm -r update --latest",
        _ => panic!("Unsupported runtime"),
    }
}

// Project package.json dependencies constants
pub(crate) const APP_CORE_VERSION: &str = "workspace:*";
pub(crate) const COMMON_VERSION: &str = "^0.2.1";
pub(crate) const CORE_VERSION: &str = "^0.3.6";
pub(crate) const EXPRESS_VERSION: &str = "^0.2.7";
pub(crate) const HYPER_EXPRESS_VERSION: &str = "^0.2.8";
pub(crate) const VALIDATOR_VERSION: &str = "^0.4.4";
pub(crate) const MIKRO_ORM_CORE_VERSION: &str = "^6.4.6";
pub(crate) const MIKRO_ORM_MIGRATIONS_VERSION: &str = "^6.4.6";
pub(crate) const MIKRO_ORM_DATABASE_VERSION: &str = "^6.4.6";
pub(crate) const MIKRO_ORM_REFLECTION_VERSION: &str = "^6.4.6";
pub(crate) const TYPEBOX_VERSION: &str = "^0.34.25";
pub(crate) const AJV_VERSION: &str = "^8.17.1";
pub(crate) const DOTENV_VERSION: &str = "^16.4.7";
pub(crate) const UUID_VERSION: &str = "^10.0.0";
pub(crate) const ZOD_VERSION: &str = "^3.24.2";

// Project package.json devDependencies constants
pub(crate) const ESLINT_VERSION: &str = "^9.17.0";
pub(crate) const MIKRO_ORM_CLI_VERSION: &str = "^6.4.6";
pub(crate) const TS_NODE_VERSION: &str = "^10.9.2";
pub(crate) const TYPEDOC_VERSION: &str = "^0.27.7";
pub(crate) const TYPES_UUID_VERSION: &str = "^10.0.0";
pub(crate) const TYPESCRIPT_ESLINT_VERSION: &str = "^8.24.1";

// Project package.json scripts constants
pub(crate) const PROJECT_BUILD_SCRIPT: &str = "tsc";
pub(crate) const PROJECT_DOCS_SCRIPT: &str = "typedoc --out docs *";
pub(crate) const PROJECT_FORMAT_SCRIPT: &str =
    "prettier --ignore-path=.prettierignore --config .prettierrc '**/*.{ts,tsx,json}' --write";
pub(crate) const PROJECT_LINT_SCRIPT: &str = "eslint . -c eslint.config.mjs";
pub(crate) const PROJECT_LINT_FIX_SCRIPT: &str = "eslint . -c eslint.config.mjs --fix";
pub(crate) const PROJECT_START_SCRIPT: &str =
    "ENV_FILE_PATH=.env.prod && pnpm migrate:up && node --import tsx dist/server.js";
pub(crate) fn project_clean_script(runtime: &str) -> &'static str {
    match runtime {
        "bun" => "rm -rf dist bun.lockb node_modules",
        "node" => "rm -rf dist pnpm.lock.yaml node_modules",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_dev_script(runtime: &str) -> &'static str {
    match runtime {
        "bun" => "bun migrate:up && bun --watch server.ts",
        "node" => "pnpm migrate:up && tsx watch server.ts",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_dev_local_script(runtime: &str) -> &'static str {
    match runtime {
        "bun" => "ENV_FILE_PATH=.env.local bun migrate:up && bun --watch server.ts",
        "node" => "ENV_FILE_PATH=.env.local pnpm migrate:up && tsx watch server.ts",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_test_script(test_framework: &str) -> &'static str {
    match test_framework {
        "vitest" => "vitest --passWithNoTests",
        "jest" => "jest --passWithNoTests",
        _ => panic!("Unsupported test framework"),
    }
}
pub(crate) fn project_migrate_script(command: &str) -> String {
    let base =
        "ENV_FILE_PATH=.env.local NODE_OPTIONS='--require ts-node/register' mikro-orm migration:";
    match command {
        "create" => format!("{}{}", base, "create"),
        "down" => format!("{}{}", base, "down"),
        "init" => format!("{}{}", base, "create --initial"),
        "up" => format!("{}{}", base, "up"),
        _ => panic!("Unsupported migration command"),
    }
}
