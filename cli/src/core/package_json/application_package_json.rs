use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApplicationScripts {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clean: Option<String>,
    #[serde(rename = "clean:purge", skip_serializing_if = "Option::is_none")]
    pub clean_purge: Option<String>,
    #[serde(rename = "database:setup", skip_serializing_if = "Option::is_none")]
    pub database_setup: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dev: Option<String>,
    #[serde(rename = "dev:build", skip_serializing_if = "Option::is_none")]
    pub dev_build: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lint: Option<String>,
    #[serde(rename = "lint:fix", skip_serializing_if = "Option::is_none")]
    pub lint_fix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prepare: Option<String>,
    #[serde(rename = "migrate:create", skip_serializing_if = "Option::is_none")]
    pub migrate_create: Option<String>,
    #[serde(rename = "migrate:down", skip_serializing_if = "Option::is_none")]
    pub migrate_down: Option<String>,
    #[serde(rename = "migrate:init", skip_serializing_if = "Option::is_none")]
    pub migrate_init: Option<String>,
    #[serde(rename = "migrate:up", skip_serializing_if = "Option::is_none")]
    pub migrate_up: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test: Option<String>,
    #[serde(rename = "up:packages", skip_serializing_if = "Option::is_none")]
    pub up_packages: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApplicationDevDependencies {
    #[serde(rename = "@biomejs/biome", skip_serializing_if = "Option::is_none")]
    pub biome: Option<String>,
    #[serde(rename = "@eslint/js", skip_serializing_if = "Option::is_none")]
    pub eslint_js: Option<String>,
    #[serde(rename = "@types/jest", skip_serializing_if = "Option::is_none")]
    pub types_jest: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eslint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub globals: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub husky: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jest: Option<String>,
    #[serde(rename = "lint-staged", skip_serializing_if = "Option::is_none")]
    pub lint_staged: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oxlint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prettier: Option<String>,
    #[serde(rename = "sort-package-json", skip_serializing_if = "Option::is_none")]
    pub sort_package_json: Option<String>,
    #[serde(rename = "ts-jest", skip_serializing_if = "Option::is_none")]
    pub ts_jest: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tsx: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub typescript: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub typescript_eslint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vitest: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApplicationPackageJson {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspaces: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scripts: Option<ApplicationScripts>,
    #[serde(rename = "devDependencies", skip_serializing_if = "Option::is_none")]
    pub dev_dependencies: Option<ApplicationDevDependencies>,
}
