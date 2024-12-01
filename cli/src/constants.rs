pub(crate) const LATEST_CLI_VERSION: &str = "0.1.0";
pub(crate) const PROD_API_URL: &str = "https://api.forklaunch.com";

// ERRORS
pub(crate) const ERROR_FAILED_TO_SEND_REQUEST: &str =
    "Failed to send request. Please check internet connectivity.";
pub(crate) const ERROR_FAILED_TO_WRITE_FILE: &str =
    "Failed to write file. Please check file permissions.";
pub(crate) const ERROR_FAILED_TO_GET_CWD: &str = "Failed to get current working directory.";
pub(crate) const ERROR_FAILED_TO_GET_EXE_WD: &str =
    "Failed to get executable working directory. Please ensure that the executable is in path, and has a templates directory.";
pub(crate) const ERROR_FAILED_TO_READ_MANIFEST: &str =
    "Failed to read manifest file. Please check your target directory is a forklaunch application.";
pub(crate) const ERROR_FAILED_TO_PARSE_MANIFEST: &str =
    "Failed to parse manifest file. Please verify the file is valid toml.";
pub(crate) const ERROR_FAILED_TO_READ_DOCKER_COMPOSE: &str =
    "Failed to read docker_compose.yml. Please check your target directory is a forklaunch application.";
pub(crate) const ERROR_FAILED_TO_PARSE_DOCKER_COMPOSE: &str =
    "Failed to parse docker_compose.yml. Please verify the file is valid toml.";
pub(crate) const ERROR_FAILED_TO_CREATE_SYMLINKS: &str =
    "Failed to create symlinks. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_DIR: &str =
    "Failed to create directory. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_TSCONFIG: &str =
    "Failed to create tsconfig file. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_CREATE_GITIGNORE: &str =
    "Failed to create gitignore file. Please check your target directory is writable.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_DOCKER_COMPOSE: &str =
    "Failed to add project metadata to docker-compose.yml.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_MANIFEST: &str =
    "Failed to add project metadata to manifest.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PACKAGE_JSON: &str =
    "Failed to add project metadata to package.json.";
pub(crate) const ERROR_FAILED_TO_ADD_PROJECT_METADATA_TO_PNPM_WORKSPACE: &str =
    "Failed to add project metadata to pnpm-workspace.yaml.";
