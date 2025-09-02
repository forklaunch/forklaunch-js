use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::{Expression, SourceType, Statement};
use oxc_codegen::{Codegen, CodegenOptions};

use crate::core::ast::{
    injections::inject_into_server_ts::inject_into_server_ts, parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_server_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let server_path = base_path.join("server.ts");
    let server_source_text = read_to_string(&server_path)?;
    let server_source_type = SourceType::from_path(&server_path)?;
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut server_program = parse_ast_program(&allocator, &server_source_text, server_source_type);

    let use_injection_text = format!("app.use({router_name_camel_case}Routes);",);
    let mut injection_program_ast =
        parse_ast_program(&allocator, &use_injection_text, SourceType::ts());
    inject_into_server_ts(
        &mut server_program,
        &mut injection_program_ast,
        |statements| {
            let mut maybe_splice_pos = None;
            statements.iter().enumerate().for_each(|(index, stmt)| {
                let expr = match stmt {
                    Statement::ExpressionStatement(expr) => expr,
                    _ => return,
                };

                let call = match &expr.expression {
                    Expression::CallExpression(call) => call,
                    _ => return,
                };

                let member = match &call.callee {
                    Expression::StaticMemberExpression(member) => member,
                    _ => return,
                };

                let id = match &member.object {
                    Expression::Identifier(id) => id,
                    _ => return,
                };

                if id.name == "app" && member.property.name == "use" {
                    maybe_splice_pos = Some(index + 1);
                }
            });
            maybe_splice_pos
        },
    )?;

    let forklaunch_routes_import_text = format!(
        "import {{ {router_name_pascal_case}Routes }} from './api/routes/{router_name_camel_case}.routes';",
    );
    let mut forklaunch_routes_import_injection = parse_ast_program(
        &allocator,
        &forklaunch_routes_import_text,
        server_source_type,
    );

    // Inject the import statement at the beginning of the file
    inject_into_server_ts(
        &mut server_program,
        &mut forklaunch_routes_import_injection,
        |_statements| Some(0),
    )?;

    Ok(Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&server_program)
        .code)
}

#[cfg(test)]
mod tests {
    use std::fs::{create_dir_all, write};

    use tempfile::TempDir;

    use super::*;

    fn create_test_server_ts() -> &'static str {
        r#"import { forklaunchExpress, schemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import dotenv from 'dotenv';
import { organizationRouter } from './api/routes/organization.routes';
import { permissionRouter } from './api/routes/permission.routes';
import { roleRouter } from './api/routes/role.routes';
import { userRouter } from './api/routes/user.routes';
import { createDependencyContainer } from './registrations';

//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
export const { ci, tokens } = createDependencyContainer(envFilePath);
export type ScopeFactory = typeof ci.createScope;

//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

//! creates an instance of forklaunchExpress
const app = forklaunchExpress(schemaValidator, openTelemetryCollector);

//! resolves the host, port, and version from the configuration
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use(organizationRouter);
app.use(permissionRouter);
app.use(roleRouter);
app.use(userRouter);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});
"#
    }

    fn create_temp_project_structure(server_content: &str) -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        // Create necessary directories
        create_dir_all(temp_path.join("api/routes"))
            .expect("Failed to create api/routes directory");

        // Write server.ts file
        write(temp_path.join("server.ts"), server_content).expect("Failed to write server.ts");

        temp_dir
    }

    #[test]
    fn test_transform_server_ts_successful_injection() {
        let server_content = create_test_server_ts();
        let temp_dir = create_temp_project_structure(server_content);
        let temp_path = temp_dir.path();

        let result = transform_server_ts("userManagement", temp_path);

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify the import injection
        assert!(transformed_code.contains(
            "import { UserManagementRoutes } from \"./api/routes/userManagement.routes\";"
        ));

        // Verify the app.use injection
        assert!(transformed_code.contains("app.use(userManagementRoutes);"));

        // Verify existing content is preserved
        assert!(transformed_code.contains(
            "import { forklaunchExpress, schemaValidator } from \"@forklaunch/blueprint-core\";"
        ));
        assert!(
            transformed_code.contains(
                "const app = forklaunchExpress(schemaValidator, openTelemetryCollector);"
            )
        );
        assert!(transformed_code.contains("app.listen(port, host"));
    }

    #[test]
    fn test_transform_server_ts_with_kebab_case_router_name() {
        let server_content = create_test_server_ts();
        let temp_dir = create_temp_project_structure(server_content);
        let temp_path = temp_dir.path();

        let result = transform_server_ts("order-processing", temp_path);

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify camelCase conversion in variable names
        assert!(transformed_code.contains("app.use(orderProcessingRoutes);"));

        // Verify PascalCase conversion in types and function names
        assert!(transformed_code.contains("import { OrderProcessingRoutes }"));

        // Verify the correct route file path (should be camelCase)
        assert!(transformed_code.contains("\"./api/routes/orderProcessing.routes\""));
    }

    #[test]
    fn test_transform_server_ts_preserves_existing_imports_and_exports() {
        let server_content = r#"import { forklaunchExpress, schemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import dotenv from 'dotenv';
import { organizationRouter } from './api/routes/organization.routes';
import { permissionRouter } from './api/routes/permission.routes';
import { roleRouter } from './api/routes/role.routes';
import { userRouter } from './api/routes/user.routes';
import { createDependencyContainer } from './registrations';

//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
export const { ci, tokens } = createDependencyContainer(envFilePath);
export type ScopeFactory = typeof ci.createScope;

//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

//! creates an instance of forklaunchExpress
const app = forklaunchExpress(schemaValidator, openTelemetryCollector);

//! resolves the host, port, and version from the configuration
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use(organizationRouter);
app.use(permissionRouter);
app.use(roleRouter);
app.use(userRouter);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});
"#;
        let temp_dir = create_temp_project_structure(server_content);
        let temp_path = temp_dir.path();

        let result = transform_server_ts("newService", temp_path);

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify new injections are present
        assert!(
            transformed_code
                .contains("import { NewServiceRoutes } from \"./api/routes/newService.routes\";")
        );
        assert!(transformed_code.contains("app.use(newServiceRoutes);"));

        // Verify existing content is preserved
        assert!(
            transformed_code.contains(
                "import { organizationRouter } from \"./api/routes/organization.routes\";"
            )
        );
        assert!(
            transformed_code
                .contains("import { permissionRouter } from \"./api/routes/permission.routes\";")
        );
        assert!(
            transformed_code.contains("import { roleRouter } from \"./api/routes/role.routes\";")
        );
        assert!(
            transformed_code.contains("import { userRouter } from \"./api/routes/user.routes\";")
        );
        assert!(transformed_code.contains("app.use(organizationRouter);"));
        assert!(transformed_code.contains("app.use(permissionRouter);"));
        assert!(transformed_code.contains("app.use(roleRouter);"));
        assert!(transformed_code.contains("app.use(userRouter);"));
    }

    #[test]
    fn test_transform_server_ts_with_missing_server_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        let result = transform_server_ts("testService", temp_path);

        // Should fail because server.ts doesn't exist
        assert!(result.is_err());
    }

    #[test]
    fn test_transform_server_ts_injection_order() {
        let server_content = create_test_server_ts();
        let temp_dir = create_temp_project_structure(server_content);
        let temp_path = temp_dir.path();

        let result = transform_server_ts("testService", temp_path);

        assert!(result.is_ok());

        let transformed_code = result.unwrap();
        let lines: Vec<&str> = transformed_code.lines().collect();

        // Find line indices for verification
        let import_line = lines
            .iter()
            .position(|&line| {
                line.contains(
                    "import { TestServiceRoutes } from \"./api/routes/testService.routes\";",
                )
            })
            .expect("Import injection not found");

        let app_use_line = lines
            .iter()
            .position(|&line| line.contains("app.use(testServiceRoutes);"))
            .expect("App.use injection not found");

        // Verify injection order: import should come before app.use
        assert!(
            import_line < app_use_line,
            "Import should be injected before app.use"
        );
    }
}
