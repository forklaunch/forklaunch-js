use std::collections::HashSet;

use crate::{
    constants::{Database, Formatter, Linter, Runtime, TestFramework},
    core::database::is_in_memory_database,
};

// Shared package.json devDpendencies constants
// @biomejs/biome
pub(crate) const BIOME_VERSION: &str = "1.9.4";
// @eslint/js
pub(crate) const ESLINT_VERSION: &str = "^9.24.0";
// @types/jest
pub(crate) const JEST_TYPES_VERSION: &str = "^29.5.14";
// jest
pub(crate) const JEST_VERSION: &str = "^29.7.0";
// oxlint
pub(crate) const OXLINT_VERSION: &str = "^0.16.6";
// prettier
pub(crate) const PRETTIER_VERSION: &str = "^3.5.3";
// ts-jest
pub(crate) const TS_JEST_VERSION: &str = "^29.2.6";
// typescript-eslint
pub(crate) const TYPESCRIPT_ESLINT_VERSION: &str = "^8.33.0";
// vitest
pub(crate) const VITEST_VERSION: &str = "^3.0.8";

// Application package.json dependencies constants
// globals
pub(crate) const GLOBALS_VERSION: &str = "^16.0.0";
// husky
pub(crate) const HUSKY_VERSION: &str = "^9.1.7";
// lint-staged
pub(crate) const LINT_STAGED_VERSION: &str = "^15.4.3";
// node-gyp
pub(crate) const NODE_GYP_VERSION: &str = "^11.2.0";
// sort-package-json
pub(crate) const SORT_PACKAGE_JSON_VERSION: &str = "^3.0.0";
// tsx
pub(crate) const TSX_VERSION: &str = "^4.19.4";
// typescript
pub(crate) const TYPESCRIPT_VERSION: &str = "^5.8.2";

// Application package.json scripts constants
pub(crate) const APP_DEV_SCRIPT: &str = "docker compose up --watch";
pub(crate) const APP_DEV_BUILD_SCRIPT: &str = "docker compose build --no-cache";
pub(crate) const APP_PREPARE_SCRIPT: &str = "husky";

pub(crate) fn application_format_script(formatter: &Formatter) -> String {
    String::from(match formatter {
        Formatter::Prettier => {
            "prettier --ignore-path=.prettierignore --config .prettierrc '**/*.{ts,tsx,json}' --write"
        }
        Formatter::Biome => "biome format --write .",
    })
}

pub(crate) fn application_lint_script(linter: &Linter) -> String {
    String::from(match linter {
        Linter::Eslint => "eslint . -c eslint.config.mjs",
        Linter::Oxlint => "oxlint --config .oxlint.config.json",
    })
}

pub(crate) fn application_lint_fix_script(linter: &Linter) -> String {
    String::from(match linter {
        Linter::Eslint => "eslint . -c eslint.config.mjs --fix",
        Linter::Oxlint => "oxlint --fix --config .oxlint.config.json",
    })
}

pub(crate) fn application_build_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "bun --filter='*' run build",
        Runtime::Node => "pnpm -r run build",
    })
}

pub(crate) fn application_clean_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "rm -rf node_modules bun.lockb && bun --filter='*' clean",
        Runtime::Node => {
            "rm -rf node_modules pnpm-lock.yaml && pnpm --parallel -r clean && pnpm store prune"
        }
    })
}

pub(crate) fn application_clean_purge_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "bun run clean",
        Runtime::Node => "pnpm run clean && pnpm store clear",
    })
}

pub(crate) fn application_docs_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "bun --filter='*' docs",
        Runtime::Node => "pnpm --parallel -r run docs",
    })
}

fn get_package_manager(runtime: &Runtime) -> String {
    let package_manager = match runtime {
        Runtime::Bun => "bun --filter='*'",
        Runtime::Node => "pnpm -r",
    };

    String::from(package_manager)
}

fn get_db_init(databases: &HashSet<Database>) -> Option<String> {
    match databases.contains(&Database::MongoDB) {
        true => Some("mongo-init".to_string()),
        false => None,
    }
}

pub(crate) fn application_migrate_script<'a>(
    runtime: &Runtime,
    databases: &HashSet<Database>,
    migration_suffix: &'a str,
) -> String {
    let package_manager = get_package_manager(runtime);
    let db_init = get_db_init(databases);

    let sleep = if migration_suffix == "init" {
        "sleep 5 && "
    } else {
        ""
    };

    let mut databases = databases
        .iter()
        .filter(|db| !is_in_memory_database(db))
        .map(|db| db.to_string())
        .collect::<Vec<String>>();
    if let Some(db_init) = db_init {
        databases.push(db_init);
    }

    format!(
        "docker compose up{}{} && {}{} run migrate:{}",
        if databases.len() > 0 { " -d " } else { "" },
        databases.join(" -d "),
        sleep,
        package_manager,
        migration_suffix
    )
}

pub(crate) fn application_seed_script<'a>(
    runtime: &Runtime,
    databases: &HashSet<Database>,
) -> String {
    let package_manager = get_package_manager(runtime);
    let db_init = get_db_init(databases);

    let mut databases = databases
        .iter()
        .map(|db| db.to_string())
        .collect::<Vec<String>>();
    if let Some(db_init) = db_init {
        databases.push(db_init);
    }

    format!(
        "docker compose up -d {} && {} run seed",
        databases.join(" -d "),
        package_manager
    )
}

pub(crate) fn application_setup_script(runtime: &Runtime) -> String {
    match runtime {
        Runtime::Bun => {
            String::from("bun migrate:init && bun run build && bun migrate:up && bun seed")
        }
        Runtime::Node => {
            String::from("pnpm migrate:init && pnpm run build && pnpm migrate:up && pnpm seed")
        }
    }
}

pub(crate) fn application_test_script<'a>(
    runtime: &Runtime,
    test_framework: &Option<TestFramework>,
) -> Option<String> {
    match runtime {
        Runtime::Bun => None,
        Runtime::Node => match test_framework {
            Some(test_framework_definition) => match test_framework_definition {
                TestFramework::Jest => Some("pnpm jest --passWithNoTests".to_string()),
                TestFramework::Vitest => Some("pnpm vitest --passWithNoTests".to_string()),
            },
            None => None,
        },
    }
}

pub(crate) fn application_up_packages_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "bun update --latest && bun --filter='*' update --latest",
        Runtime::Node => "pnpm -r update --latest",
    })
}

// Project package.json dependencies constants
// @forklaunch/blueprint-core
pub(crate) const APP_CORE_VERSION: &str = "workspace:*";
// @forklaunch/blueprint-monitoring
pub(crate) const APP_MONITORING_VERSION: &str = "workspace:*";
// @forklaunch/common
pub(crate) const COMMON_VERSION: &str = "^0.3.0";
// @forklaunch/core
pub(crate) const CORE_VERSION: &str = "^0.8.0";
// @forklaunch/express
pub(crate) const EXPRESS_VERSION: &str = "^0.5.0";
// @forklaunch/hyper-express
pub(crate) const HYPER_EXPRESS_VERSION: &str = "^0.5.0";
// @forklaunch/implementation-billing-base
pub(crate) const BILLING_BASE_VERSION: &str = "^0.1.14";
// @forklaunch/interfaces-billing
pub(crate) const BILLING_INTERFACES_VERSION: &str = "^0.1.14";
// @forklaunch/implementation-iam-base
pub(crate) const IAM_BASE_VERSION: &str = "^0.1.14";
// @forklaunch/interfaces-iam
pub(crate) const IAM_INTERFACES_VERSION: &str = "^0.1.14";
// @forklaunch/implementation-worker-bullmq
pub(crate) const WORKER_BULLMQ_VERSION: &str = "^0.1.6";
// @forklaunch/implementation-worker-redis
pub(crate) const WORKER_REDIS_VERSION: &str = "^0.1.6";
// @forklaunch/implementation-worker-database
pub(crate) const WORKER_DATABASE_VERSION: &str = "^0.1.6";
// @forklaunch/implementation-worker-kafka
pub(crate) const WORKER_KAFKA_VERSION: &str = "^0.1.6";
// @forklaunch/interfaces-worker
pub(crate) const WORKER_INTERFACES_VERSION: &str = "^0.1.5";
// @forklaunch/validator
pub(crate) const VALIDATOR_VERSION: &str = "^0.6.0";
// @mikro-orm/core
pub(crate) const MIKRO_ORM_CORE_VERSION: &str = "^6.4.15";
// @mikro-orm/migrations
pub(crate) const MIKRO_ORM_MIGRATIONS_VERSION: &str = "^6.4.15";
// @mikro-orm/postgresql,@mikro-orm/mongodb,@mikro-orm/mysql,@mikro-orm/better-sqlite,@mikro-orm/sqlite,@mikro-orm/mariadb,@mikro-orm/libsql,@mikro-orm/mssql
pub(crate) const MIKRO_ORM_DATABASE_VERSION: &str = "^6.4.15";
// @mikro-orm/reflection
pub(crate) const MIKRO_ORM_REFLECTION_VERSION: &str = "^6.4.15";
// @mikro-orm/seeder
pub(crate) const MIKRO_ORM_SEEDER_VERSION: &str = "^6.4.15";
// @sinclair/typebox
pub(crate) const TYPEBOX_VERSION: &str = "^0.34.33";
// ajv
pub(crate) const AJV_VERSION: &str = "^8.17.1";
// bullmq
pub(crate) const BULLMQ_VERSION: &str = "^5.53.0";
// better-sqlite3
pub(crate) const BETTER_SQLITE3_VERSION: &str = "^11.10.0";
// dotenv
pub(crate) const DOTENV_VERSION: &str = "^16.5.0";
// sqlite3
pub(crate) const SQLITE3_VERSION: &str = "^5.1.7";
// uuid
pub(crate) const UUID_VERSION: &str = "^11.1.0";
// zod
pub(crate) const ZOD_VERSION: &str = "^3.25.32";

// Project package.json devDependencies constants
// @mikro-orm/cli
pub(crate) const MIKRO_ORM_CLI_VERSION: &str = "^6.4.15";
// @types/express
pub(crate) const TYPES_EXPRESS_VERSION: &str = "^5.0.2";
// @types/express-serve-static-core
pub(crate) const TYPES_EXPRESS_SERVE_STATIC_CORE_VERSION: &str = "^5.0.6";
// @types/qs
pub(crate) const TYPES_QS_VERSION: &str = "^6.14.0";
// typedoc
pub(crate) const TYPEDOC_VERSION: &str = "^0.28.5";
// @types/uuid
pub(crate) const TYPES_UUID_VERSION: &str = "^10.0.0";

// Project package.json scripts constants
pub(crate) const PROJECT_BUILD_SCRIPT: &str = "tsc";
pub(crate) const PROJECT_DOCS_SCRIPT: &str = "typedoc --out docs *";
pub(crate) const PROJECT_START_WORKER_CLIENT_SCRIPT: &str =
    "ENV_FILE_PATH=.env.prod node --import tsx dist/client.js";
pub(crate) const PROJECT_SEED_SCRIPT: &str = "[ -z $ENV_FILE_PATH ] && export ENV_FILE_PATH=.env.local; NODE_OPTIONS='--import=tsx' mikro-orm seeder:run";

pub(crate) fn project_format_script(formatter: &Formatter) -> String {
    String::from(match formatter {
        Formatter::Prettier => {
            "prettier --ignore-path=.prettierignore --config .prettierrc '**/*.{ts,tsx,json}' --write"
        }
        Formatter::Biome => "biome format --write .",
    })
}

pub(crate) fn project_lint_script(linter: &Linter) -> String {
    String::from(match linter {
        Linter::Eslint => "eslint . -c eslint.config.mjs",
        Linter::Oxlint => "oxlint --config .oxlint.config.json",
    })
}

pub(crate) fn project_lint_fix_script(linter: &Linter) -> String {
    String::from(match linter {
        Linter::Eslint => "eslint . -c eslint.config.mjs --fix",
        Linter::Oxlint => "oxlint --fix --config .oxlint.config.json",
    })
}

pub(crate) fn project_clean_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "rm -rf dist bun.lockb node_modules",
        Runtime::Node => "rm -rf dist pnpm.lock.yaml node_modules",
    })
}

pub(crate) fn project_dev_server_script(runtime: &Runtime, is_database_enabled: bool) -> String {
    String::from(match runtime {
        Runtime::Bun => format!(
            "{}bun --watch server.ts",
            if is_database_enabled {
                "bun migrate:up && "
            } else {
                ""
            }
        ),
        Runtime::Node => format!(
            "{}pnpm tsx watch server.ts",
            if is_database_enabled {
                "pnpm migrate:up && "
            } else {
                ""
            }
        ),
    })
}

pub(crate) fn project_dev_local_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => {
            "ENV_FILE_PATH=.env.local bun migrate:up && ENV_FILE_PATH=.env.local bun --watch server.ts"
        }
        Runtime::Node => {
            "ENV_FILE_PATH=.env.local pnpm migrate:up && ENV_FILE_PATH=.env.local pnpm tsx watch server.ts"
        }
    })
}

pub(crate) fn project_test_script(
    runtime: &Runtime,
    test_framework: &Option<TestFramework>,
) -> Option<String> {
    match runtime {
        Runtime::Bun => None,
        Runtime::Node => match test_framework {
            Some(test_framework_definition) => match test_framework_definition {
                TestFramework::Jest => Some("pnpm jest --passWithNoTests".to_string()),
                TestFramework::Vitest => Some("pnpm vitest --passWithNoTests".to_string()),
            },
            None => None,
        },
    }
}

pub(crate) fn project_migrate_script(command: &str) -> String {
    let base = "[ -z $ENV_FILE_PATH ] && export ENV_FILE_PATH=.env.local; NODE_OPTIONS='--import=tsx' mikro-orm migration:";
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

pub(crate) fn project_start_server_script(runtime: &Runtime, is_database_enabled: bool) -> String {
    format!(
        "{}ENV_FILE_PATH=.env.prod node --import tsx dist/server.js",
        if is_database_enabled {
            format!(
                "ENV_FILE_PATH=.env.prod {} migrate:up && ",
                if runtime == &Runtime::Node {
                    "pnpm"
                } else {
                    "bun"
                }
            )
        } else {
            "".to_string()
        }
    )
}
pub(crate) fn project_start_worker_script(runtime: &Runtime, is_database_enabled: bool) -> String {
    format!(
        "{}ENV_FILE_PATH=.env.prod node --import tsx dist/worker.js",
        if is_database_enabled {
            format!(
                "{} migrate:up && ",
                if runtime == &Runtime::Node {
                    "pnpm"
                } else {
                    "bun"
                }
            )
        } else {
            "".to_string()
        }
    )
}

pub(crate) fn project_dev_worker_client_script(runtime: &Runtime) -> String {
    String::from(match runtime {
        Runtime::Bun => "bun --watch worker.ts",
        Runtime::Node => "pnpm tsx watch worker.ts",
    })
}

pub(crate) fn project_dev_local_worker_script(
    runtime: &Runtime,
    is_database_enabled: bool,
) -> String {
    String::from(match runtime {
        Runtime::Bun => format!(
            "{}ENV_FILE_PATH=.env.local bun --watch server.ts && ENV_FILE_PATH=.env.local bun --watch worker.ts",
            if is_database_enabled {
                "ENV_FILE_PATH=.env.local bun migrate:up && "
            } else {
                ""
            }
        ),
        Runtime::Node => format!(
            "{}ENV_FILE_PATH=.env.local pnpm tsx watch server.ts && ENV_FILE_PATH=.env.local pnpm tsx watch worker.ts",
            if is_database_enabled {
                "ENV_FILE_PATH=.env.local pnpm migrate:up && "
            } else {
                ""
            }
        ),
    })
}

pub(crate) const SQLITE_POSTINSTALL_SCRIPT: &str =
    "cd node_modules/sqlite3 && node-gyp configure && node-gyp build";
pub(crate) const BETTER_SQLITE_POSTINSTALL_SCRIPT: &str =
    "cd node_modules/better-sqlite3 && node-gyp configure && node-gyp build";
