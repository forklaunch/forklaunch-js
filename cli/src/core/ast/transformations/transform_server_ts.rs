use std::{fs::read_to_string, path::Path};

use anyhow::Result;
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::{Declaration, Expression, SourceType, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use crate::core::ast::{
    injections::{
        inject_into_import_statement::inject_into_import_statement,
        inject_into_server_ts::inject_into_server_ts,
    },
    parse_ast_program::parse_ast_program,
};

pub(crate) fn transform_server_ts(router_name: &str, base_path: &Path) -> Result<String> {
    let allocator = Allocator::default();
    let server_path = base_path.join("server.ts");
    let server_source_text = read_to_string(&server_path)?;
    let server_source_type = SourceType::from_path(&server_path)?;
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);

    let mut server_program = parse_ast_program(&allocator, &server_source_text, server_source_type);

    let scoped_service_factory_injection_text = format!(
        "const {router_name_pascal_case}ServiceFactory = ci.scopedResolver(tokens.{router_name_pascal_case}Service);",
    );
    let mut injection_program_ast = parse_ast_program(
        &allocator,
        &scoped_service_factory_injection_text,
        SourceType::ts(),
    );

    inject_into_server_ts(
        &mut server_program,
        &mut injection_program_ast,
        |statements| {
            let mut maybe_splice_pos = None;

            statements
                .iter()
                .enumerate()
                .for_each(|(index, inner_stmt)| {
                    let expr = match inner_stmt {
                        Statement::VariableDeclaration(expr) => expr,
                        _ => return,
                    };

                    let call = match &expr.declarations[0].init {
                        Some(Expression::CallExpression(call)) => call,
                        _ => return,
                    };

                    let expr_member = match &call.callee {
                        Expression::StaticMemberExpression(expr_member) => expr_member,
                        _ => return,
                    };

                    let identifier = match &expr_member.object {
                        Expression::Identifier(identifier) => identifier,
                        _ => return,
                    };

                    if identifier.name == "ci" && expr_member.property.name == "scopedResolver" {
                        maybe_splice_pos = Some(index + 1);
                    }
                });
            maybe_splice_pos
        },
    )?;

    let routes_injection_text = format!(
        "export const {router_name_camel_case}Routes = {router_name_pascal_case}Routes(() => ci.createScope(), {router_name_pascal_case}ServiceFactory, openTelemetryCollector);",
    );
    let mut injection_program_ast =
        parse_ast_program(&allocator, &routes_injection_text, SourceType::ts());
    inject_into_server_ts(
        &mut server_program,
        &mut injection_program_ast,
        |statements| {
            let mut maybe_splice_pos = None;

            statements
                .iter()
                .enumerate()
                .for_each(|(index, inner_stmt)| {
                    let export = match inner_stmt {
                        Statement::ExportNamedDeclaration(export) => export,
                        _ => return,
                    };

                    let expr = match &export.declaration {
                        Some(Declaration::VariableDeclaration(expr)) => expr,
                        _ => return,
                    };

                    let call = match &expr.declarations[0].init {
                        Some(Expression::CallExpression(call)) => call,
                        _ => return,
                    };

                    let identifier = match &call.callee {
                        Expression::Identifier(identifier) => identifier,
                        _ => return,
                    };

                    if identifier.name.contains("Routes") {
                        maybe_splice_pos = Some(index + 1);
                    }
                });
            maybe_splice_pos
        },
    )?;

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

    inject_into_import_statement(
        &mut server_program,
        &mut forklaunch_routes_import_injection,
        format!("./api/routes/{router_name_camel_case}.routes").as_str(),
    )?;

    Ok(CodeGenerator::new()
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
        r#"import express from 'express';
import { ci } from './registrations';
import { openTelemetryCollector } from '@forklaunch/core';

const app = express();

// This structure with arrow functions is what inject_into_server_ts expects
const someServiceFactory = ci.scopedResolver(tokens.SomeService);

export const someRoutes = SomeRoutes(() => ci.createScope(), someServiceFactory, openTelemetryCollector);

app.use(someRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
"#
    }

    fn create_temp_project_structure(server_content: &str) -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();
        
        // Create necessary directories
        create_dir_all(temp_path.join("api/routes")).expect("Failed to create api/routes directory");
        
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
        
        // Verify the scoped service factory injection
        assert!(transformed_code.contains("const UserManagementServiceFactory = ci.scopedResolver(tokens.UserManagementService);"));
        
        // Verify the routes export injection
        assert!(transformed_code.contains("export const userManagementRoutes = UserManagementRoutes(() => ci.createScope(), UserManagementServiceFactory, openTelemetryCollector);"));
        
        // Verify the app.use injection
        assert!(transformed_code.contains("app.use(userManagementRoutes);"));
        
        // Verify the import injection
        assert!(transformed_code.contains("import { UserManagementRoutes } from \"./api/routes/userManagement.routes\";"));
        
        // Verify existing content is preserved
        assert!(transformed_code.contains("import express from \"express\";"));
        assert!(transformed_code.contains("const app = express();"));
        assert!(transformed_code.contains("app.listen(port"));
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
        assert!(transformed_code.contains("const OrderProcessingServiceFactory"));
        assert!(transformed_code.contains("export const orderProcessingRoutes"));
        assert!(transformed_code.contains("app.use(orderProcessingRoutes);"));
        
        // Verify PascalCase conversion in types and function names
        assert!(transformed_code.contains("tokens.OrderProcessingService"));
        assert!(transformed_code.contains("OrderProcessingRoutes("));
        assert!(transformed_code.contains("import { OrderProcessingRoutes }"));
        
        // Verify the correct route file path (should remain kebab-case)
        assert!(transformed_code.contains("\"./api/routes/orderProcessing.routes\""));
    }

    #[test]
    fn test_transform_server_ts_preserves_existing_imports_and_exports() {
        let server_content = r#"import express from 'express';
import { ci } from './registrations';
import { openTelemetryCollector } from '@forklaunch/core';
import { ExistingRoutes } from './api/routes/existing.routes';

const app = express();

const existingServiceFactory = ci.scopedResolver(tokens.ExistingService);
const anotherServiceFactory = ci.scopedResolver(tokens.AnotherService);

export const existingRoutes = ExistingRoutes(() => ci.createScope(), existingServiceFactory, openTelemetryCollector);
export const anotherRoutes = AnotherRoutes(() => ci.createScope(), anotherServiceFactory, openTelemetryCollector);

app.use(existingRoutes);
app.use(anotherRoutes);

app.listen(3000);
"#;
        let temp_dir = create_temp_project_structure(server_content);
        let temp_path = temp_dir.path();
        
        let result = transform_server_ts("newService", temp_path);
        
        assert!(result.is_ok());
        
        let transformed_code = result.unwrap();
        
        // Verify new injections are present
        assert!(transformed_code.contains("const NewServiceServiceFactory = ci.scopedResolver(tokens.NewServiceService);"));
        assert!(transformed_code.contains("export const newServiceRoutes = NewServiceRoutes(() => ci.createScope(), NewServiceServiceFactory, openTelemetryCollector);"));
        assert!(transformed_code.contains("app.use(newServiceRoutes);"));
        assert!(transformed_code.contains("import { NewServiceRoutes } from \"./api/routes/newService.routes\";"));
        
        // Verify existing content is preserved
        assert!(transformed_code.contains("import { ExistingRoutes } from \"./api/routes/existing.routes\";"));
        assert!(transformed_code.contains("const existingServiceFactory = ci.scopedResolver(tokens.ExistingService);"));
        assert!(transformed_code.contains("const anotherServiceFactory = ci.scopedResolver(tokens.AnotherService);"));
        assert!(transformed_code.contains("export const existingRoutes = ExistingRoutes"));
        assert!(transformed_code.contains("export const anotherRoutes = AnotherRoutes"));
        assert!(transformed_code.contains("app.use(existingRoutes);"));
        assert!(transformed_code.contains("app.use(anotherRoutes);"));
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
        let service_factory_line = lines.iter().position(|&line| 
            line.contains("const TestServiceServiceFactory = ci.scopedResolver(tokens.TestServiceService);")
        ).expect("Service factory injection not found");
        
        let routes_export_line = lines.iter().position(|&line| 
            line.contains("export const testServiceRoutes = TestServiceRoutes")
        ).expect("Routes export injection not found");
        
        let app_use_line = lines.iter().position(|&line| 
            line.contains("app.use(testServiceRoutes);")
        ).expect("App.use injection not found");
        
        // Verify injection order: service factory should come before routes export
        assert!(service_factory_line < routes_export_line, 
            "Service factory should be injected before routes export");
        
        // Verify routes export should come before app.use
        assert!(routes_export_line < app_use_line, 
            "Routes export should be injected before app.use");
    }
}
