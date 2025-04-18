use std::path::Path;

pub(crate) const PROD_API_URL: &str = "https://api.forklaunch.com";

pub(crate) const VALID_DATABASES: [&str; 2] = ["postgresql", "mongodb"];
pub(crate) const VALID_WORKER_BACKENDS: [&str; 2] = ["database", "cache"];
pub(crate) const VALID_VALIDATORS: [&str; 2] = ["zod", "typebox"];
pub(crate) const VALID_FRAMEWORKS: [&str; 2] = ["express", "hyper-express"];
pub(crate) const VALID_TEST_FRAMEWORKS: [&str; 2] = ["vitest", "jest"];
pub(crate) const VALID_SERVICES: [&str; 2] = ["billing", "iam"];
// pub(crate) const VALID_LIBRARIES: [&str; 1] = ["monitoring"];
pub(crate) const VALID_RUNTIMES: [&str; 2] = ["node", "bun"];
pub(crate) const VALID_LICENSES: [&str; 9] = [
    "apgl",
    "gpl",
    "lgpl",
    "mozilla",
    "apache",
    "mit",
    "boost",
    "unlicense",
    "none",
];

// ERRORS
pub(crate) fn error_failed_to_write_file(path: &Path) -> String {
    format!(
        "Failed to write file {}. Please check file permissions.",
        path.to_string_lossy()
    )
}
pub(crate) fn error_failed_to_create_symlink(path: &Path) -> String {
    format!(
        "Failed to create symlink {}. Please check your target directory is writable.",
        path.to_string_lossy()
    )
}
pub(crate) fn error_failed_to_create_dir(path: &Path) -> String {
    format!(
        "Failed to create directory {}. Please check your target directory is writable.",
        path.to_string_lossy()
    )
}

pub(crate) const ERROR_FAILED_TO_SEND_REQUEST: &str =
    "Failed to send request. Please check internet connectivity.";
pub(crate) const ERROR_FAILED_TO_GET_CWD: &str = "Failed to get current working directory.";
pub(crate) const ERROR_FAILED_TO_READ_MANIFEST: &str =
    "Failed to read manifest file. Please check your target directory is a forklaunch application.";
pub(crate) const ERROR_FAILED_TO_PARSE_MANIFEST: &str =
    "Failed to parse manifest file. Please verify the file is valid toml.";
pub(crate) const ERROR_FAILED_TO_READ_DOCKER_COMPOSE: &str =
    "Failed to read docker_compose.yaml. Please check your target directory is a forklaunch application.";
pub(crate) const ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE: &str =
    "Failed to parse docker_compose.yaml. Please verify the file is valid yaml.";
pub(crate) const ERROR_FAILED_TO_CREATE_PACKAGE_JSON: &str =
    "Failed to create package.json. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_READ_PACKAGE_JSON: &str =
    "Failed to read package.json. Please check your target directory is a forklaunch application.";
pub(crate) const ERROR_FAILED_TO_PARSE_PACKAGE_JSON: &str =
    "Failed to parse package.json. Please verify the file is valid json.";
pub(crate) const ERROR_FAILED_TO_GENERATE_PACKAGE_JSON: &str = "Failed to generate package.json.";
pub(crate) const ERROR_FAILED_TO_READ_PNPM_WORKSPACE: &str =
    "Failed to read pnpm-workspace.yaml. Please check your target directory is a forklaunch application.";
pub(crate) const ERROR_FAILED_TO_PARSE_PNPM_WORKSPACE: &str =
    "Failed to parse pnpm-workspace.yaml. Please verify the file is valid yaml.";
pub(crate) const ERROR_FAILED_TO_CREATE_SYMLINKS: &str =
    "Failed to create symlinks. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_DIR: &str =
    "Failed to create directory. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_MANIFEST: &str =
    "Failed to create manifest file. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_TSCONFIG: &str =
    "Failed to create tsconfig file. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_GITIGNORE: &str =
    "Failed to create gitignore file. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_LICENSE: &str =
    "Failed to create license file. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_GENERATE_PNPM_WORKSPACE: &str =
    "Failed to generate pnpm-workspace.yaml.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE: &str =
    "Failed to add project metadata to docker-compose.yaml.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST: &str =
    "Failed to add project metadata to manifest.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON: &str =
    "Failed to add project metadata to package.json.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE: &str =
    "Failed to add project metadata to pnpm-workspace.yaml.";
pub(crate) const ERROR_FAILED_TO_SETUP_IAM: &str =
    "Failed to create private and public keys needed for iam service.";
pub(crate) const ERROR_UNSUPPORTED_DATABASE: &str =
    "Unsupported database. Failed to create base entity.";
pub(crate) const ERROR_DATABASE_INFORMATION: &str = 
    "Database information not found, please ensure your service defines a database in your manifest.";
pub(crate) const ERROR_FAILED_TO_ADD_ROUTER_TO_APP: &str = "Failed to add router metadata to app.";
pub(crate) const ERROR_FAILED_TO_ADD_ROUTER_TO_BOOTSTRAPPER: &str =
    "Failed to add router metadata to bootstrapper.";
pub(crate) const ERROR_FAILED_TO_ADD_ROUTER_METADATA_TO_MANIFEST: &str =
    "Failed to add router metadata to manifest.";
pub(crate) const ERROR_FAILED_TO_CREATE_DATABASE_EXPORT_INDEX_TS: &str =
    "Failed to create database export index.ts in core/persistence.";
pub(crate) const ERROR_FAILED_TO_CREATE_LIBRARY_PACKAGE_JSON: &str =
    "Failed to create library package.json.";
pub(crate) const ERROR_FAILED_TO_ADD_SERVICE_METADATA_TO_ARTIFACTS: &str =
    "Failed to add service metadata to artifacts.";
pub(crate) const ERROR_FAILED_TO_UPDATE_APPLICATION_PACKAGE_JSON: &str =
    "Failed to update application package.json.";
pub(crate) const ERROR_FAILED_TO_ADD_BASE_ENTITY_TO_CORE: &str =
    "Failed to add base entity to core.";
pub(crate) const ERROR_FAILED_TO_WRITE_SERVICE_FILES: &str =
    "Failed to write service files.";
pub(crate) const ERROR_FAILED_TO_EJECT_DIRECTORY_NOT_EJECTABLE: &str =
    "Failed to eject directory. Please check your target directory is a preconfigured forklaunch module.";
