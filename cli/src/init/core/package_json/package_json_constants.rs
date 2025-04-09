// Application package.json dependencies constants
// globals
pub(crate) const GLOBALS_VERSION: &str = "^16.0.0";
// husky
pub(crate) const HUSKY_VERSION: &str = "^9.1.7";
// @types/jest
pub(crate) const JEST_TYPES_VERSION: &str = "^29.5.14";
// jest
pub(crate) const JEST_VERSION: &str = "^29.7.0";
// lint-staged
pub(crate) const LINT_STAGED_VERSION: &str = "^15.4.3";
// sort-package-json
pub(crate) const SORT_PACKAGE_JSON_VERSION: &str = "^3.0.0";
// ts-jest
pub(crate) const TS_JEST_VERSION: &str = "^29.2.6";
// tsx
pub(crate) const TSX_VERSION: &str = "^4.19.3";
// typescript
pub(crate) const TYPESCRIPT_VERSION: &str = "^5.8.2";
// vitest
pub(crate) const VITEST_VERSION: &str = "^3.0.8";

// Application package.json scripts constants
pub(crate) const APP_DEV_SCRIPT: &str = "docker compose up --watch";
pub(crate) const APP_DEV_BUILD_SCRIPT: &str = "docker compose up --watch --build";
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
        "bun" => "rm -rf node_modules bun.lockb && bun --filter='*' clean",
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
fn get_package_manager_and_db_init(runtime: &str, database: &str) -> (String, String) {
    let package_manager = match runtime {
        "bun" => "bun --filter='*'",
        "node" => "pnpm -r",
        _ => panic!("Unsupported runtime"),
    };

    let db_init = match database {
        "mongodb" => "-d mongo-init",
        _ => "",
    };

    (package_manager.to_string(), db_init.to_string())
}

pub(crate) fn application_migrate_script(
    runtime: &str,
    database: &str,
    migration_suffix: &str,
) -> String {
    let (package_manager, db_init) = get_package_manager_and_db_init(runtime, database);

    let sleep = if migration_suffix == "init" {
        "sleep 5 && "
    } else {
        ""
    };

    format!(
        "docker compose up --watch -d {} {} && {}{} run migrate:{}",
        database, db_init, sleep, package_manager, migration_suffix
    )
}

pub(crate) fn application_seed_script(runtime: &str, database: &str) -> String {
    let (package_manager, db_init) = get_package_manager_and_db_init(runtime, database);

    format!(
        "docker compose up --watch -d {} {} && {} run seed",
        database, db_init, package_manager
    )
}
pub(crate) fn application_setup_script(runtime: &str) -> String {
    match runtime {
        "bun" => "bun migrate:init && bun migrate:up && bun seed".to_string(),
        "node" => "pnpm migrate:init && pnpm migrate:up && pnpm seed".to_string(),
        _ => panic!("Unsupported runtime"),
    }
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
// @forklaunch/blueprint-core
pub(crate) const APP_CORE_VERSION: &str = "workspace:*";
// @forklaunch/blueprint-monitoring
pub(crate) const APP_MONITORING_VERSION: &str = "workspace:*";
// @forklaunch/common
pub(crate) const COMMON_VERSION: &str = "^0.2.6";
// @forklaunch/core
pub(crate) const CORE_VERSION: &str = "^0.6.5";
// @forklaunch/express
pub(crate) const EXPRESS_VERSION: &str = "^0.4.5";
// @forklaunch/hyper-express
pub(crate) const HYPER_EXPRESS_VERSION: &str = "^0.4.5";
// @forklaunch/implementation-billing-base
pub(crate) const BILLING_BASE_VERSION: &str = "^0.1.7";
// @forklaunch/interfaces-billing
pub(crate) const BILLING_INTERFACES_VERSION: &str = "^0.1.7";
// @forklaunch/implementation-iam-base
pub(crate) const IAM_BASE_VERSION: &str = "^0.1.7";
// @forklaunch/interfaces-iam
pub(crate) const IAM_INTERFACES_VERSION: &str = "^0.1.7";
// @forklaunch/validator
pub(crate) const VALIDATOR_VERSION: &str = "^0.4.12";
// @mikro-orm/core
pub(crate) const MIKRO_ORM_CORE_VERSION: &str = "^6.4.12";
// @mikro-orm/migrations
pub(crate) const MIKRO_ORM_MIGRATIONS_VERSION: &str = "^6.4.12";
// @mikro-orm/postgresql,@mikro-orm/mongodb
pub(crate) const MIKRO_ORM_DATABASE_VERSION: &str = "^6.4.12";
// @mikro-orm/reflection
pub(crate) const MIKRO_ORM_REFLECTION_VERSION: &str = "^6.4.12";
// @mikro-orm/seeder
pub(crate) const MIKRO_ORM_SEEDER_VERSION: &str = "^6.4.12";
// typebox
pub(crate) const TYPEBOX_VERSION: &str = "^0.34.33";
// ajv
pub(crate) const AJV_VERSION: &str = "^8.17.1";
// dotenv
pub(crate) const DOTENV_VERSION: &str = "^16.4.7";
// uuid
pub(crate) const UUID_VERSION: &str = "^11.1.0";
// zod
pub(crate) const ZOD_VERSION: &str = "^3.24.2";

// Project package.json devDependencies constants
// eslint
pub(crate) const ESLINT_VERSION: &str = "^9.24.0";
// @mikro-orm/cli
pub(crate) const MIKRO_ORM_CLI_VERSION: &str = "^6.4.12";
// @types/express
pub(crate) const TYPES_EXPRESS_VERSION: &str = "^5.0.1";
// @types/express-serve-static-core
pub(crate) const TYPES_EXPRESS_SERVE_STATIC_CORE_VERSION: &str = "^5.0.6";
// @types/qs
pub(crate) const TYPES_QS_VERSION: &str = "^6.9.18";
// typedoc
pub(crate) const TYPEDOC_VERSION: &str = "^0.28.2";
// @types/uuid
pub(crate) const TYPES_UUID_VERSION: &str = "^10.0.0";
// typescript-eslint
pub(crate) const TYPESCRIPT_ESLINT_VERSION: &str = "^8.29.1";

// Project package.json scripts constants
pub(crate) const PROJECT_BUILD_SCRIPT: &str = "tsc";
pub(crate) const PROJECT_DOCS_SCRIPT: &str = "typedoc --out docs *";
pub(crate) const PROJECT_FORMAT_SCRIPT: &str =
    "prettier --ignore-path=.prettierignore --config .prettierrc '**/*.{ts,tsx,json}' --write";
pub(crate) const PROJECT_LINT_SCRIPT: &str = "eslint . -c eslint.config.mjs";
pub(crate) const PROJECT_LINT_FIX_SCRIPT: &str = "eslint . -c eslint.config.mjs --fix";
pub(crate) const PROJECT_START_WORKER_CLIENT_SCRIPT: &str =
    "ENV_FILE_PATH=.env.prod node --import tsx dist/client.js";
pub(crate) const PROJECT_SEED_SCRIPT: &str = "[ -z $ENV_FILE_PATH ] && export ENV_FILE_PATH=.env.local; NODE_OPTIONS='--import=tsx' mikro-orm seeder:run";
pub(crate) fn project_clean_script(runtime: &str) -> &'static str {
    match runtime {
        "bun" => "rm -rf dist bun.lockb node_modules",
        "node" => "rm -rf dist pnpm.lock.yaml node_modules",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_dev_server_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "bun migrate:up && bun --watch server.ts",
        "node" => "pnpm migrate:up && pnpm tsx watch server.ts",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_dev_worker_script(runtime: &str, cache_backend: bool) -> String {
    match runtime {
        "bun" => format!(
            "{}bun --watch worker.ts",
            if !cache_backend {
                "bun migrate:up && "
            } else {
                ""
            }
        ),
        "node" => format!(
            "{}pnpm tsx watch worker.ts",
            if !cache_backend {
                "pnpm migrate:up && "
            } else {
                ""
            }
        ),
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_dev_local_script(runtime: &str) -> &'static str {
    match runtime {
        "bun" => "ENV_FILE_PATH=.env.local bun migrate:up && ENV_FILE_PATH=.env.local bun --watch server.ts",
        "node" => "ENV_FILE_PATH=.env.local pnpm migrate:up && ENV_FILE_PATH=.env.local pnpm tsx watch server.ts",
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
        "[ -z $ENV_FILE_PATH ] && export ENV_FILE_PATH=.env.local; NODE_OPTIONS='--import=tsx' mikro-orm migration:";
    match command {
        "create" => format!("{}{}", base, "create"),
        "down" => format!("{}{}", base, "down"),
        "init" => format!(
            "if [ ! -f migrations/Migration* ]; then {}{}; fi",
            base, "create --initial"
        ),
        "up" => format!("{}{}", base, "up"),
        _ => panic!("Unsupported migration command"),
    }
}
pub(crate) fn project_start_server_script() -> String {
    "ENV_FILE_PATH=.env.prod pnpm migrate:up && ENV_FILE_PATH=.env.prod node --import tsx dist/server.js".to_string()
}
pub(crate) fn project_start_worker_script(cache_backend: bool) -> String {
    format!(
        "{}ENV_FILE_PATH=.env.prod node --import tsx dist/worker.js",
        if !cache_backend {
            "ENV_FILE_PATH=.env.prod pnpm migrate:up && "
        } else {
            ""
        }
    )
}
pub(crate) fn project_dev_client_script(runtime: &str) -> &str {
    match runtime {
        "bun" => "bun --watch client.ts",
        "node" => "pnpm tsx watch client.ts",
        _ => panic!("Unsupported runtime"),
    }
}
pub(crate) fn project_dev_local_worker_script(runtime: &str, cache_backend: bool) -> String {
    match runtime {
        "bun" => format!(
            "{}ENV_FILE_PATH=.env.local bun --watch worker.ts && ENV_FILE_PATH=.env.local bun --watch client.ts",
            if !cache_backend {
                "ENV_FILE_PATH=.env.local bun migrate:up && "
            } else {
                ""
            }
        ),
        "node" => format!(
            "{}ENV_FILE_PATH=.env.local pnpm tsx watch worker.ts && ENV_FILE_PATH=.env.local pnpm tsx watch client.ts",
            if !cache_backend {
                "ENV_FILE_PATH=.env.local pnpm migrate:up && "
            } else {
                ""
            }
        ),
        _ => panic!("Unsupported runtime"),
    }
}
