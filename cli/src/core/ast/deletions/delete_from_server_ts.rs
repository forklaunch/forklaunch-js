use anyhow::{Result, bail};
use convert_case::{Case, Casing};
use oxc_allocator::Allocator;
use oxc_ast::ast::{Argument, Declaration, Expression, Program, Statement};
use oxc_codegen::{CodeGenerator, CodegenOptions};

use super::delete_import_statement::delete_import_statement;

pub(crate) fn delete_from_server_ts<'a, F>(
    server_program_ast: &mut Program<'a>,
    server_ts_injection_pos: F,
) -> Result<()>
where
    F: Fn(&oxc_allocator::Vec<'a, Statement>) -> Option<usize>,
{
    let splice_pos = match server_ts_injection_pos(&server_program_ast.body) {
        Some(pos) => pos,
        None => bail!("Failed to delete from server.ts"),
    };

    server_program_ast.body.remove(splice_pos);

    Ok(())
}

pub(crate) fn delete_from_server_ts_router<'a>(
    allocator: &'a Allocator,
    server_program: &mut Program<'a>,
    router_name: &str,
) -> Result<String> {
    let router_name_camel_case = router_name.to_case(Case::Camel);
    let router_name_pascal_case = router_name.to_case(Case::Pascal);
    delete_from_server_ts(server_program, |statements| {
        let mut maybe_splice_pos = None;

        statements
            .iter()
            .enumerate()
            .for_each(|(index, inner_stmt)| {
                let expr = match inner_stmt {
                    Statement::VariableDeclaration(expr) => expr,
                    _ => return,
                };

                match expr.declarations[0].id.get_identifier_name() {
                    Some(name) if name == format!("{router_name_pascal_case}ServiceFactory") => {
                        // This is the one we want to delete, continue processing
                    }
                    _ => return, // Skip all others
                }

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
                    maybe_splice_pos = Some(index);
                }
            });
        maybe_splice_pos
    })?;
    delete_from_server_ts(server_program, |statements| {
        let mut maybe_splice_pos = None;

        statements
            .iter()
            .enumerate()
            .for_each(|(index, inner_stmt)| {
                let expr = match inner_stmt {
                    Statement::ExportNamedDeclaration(export) => match &export.declaration {
                        Some(Declaration::VariableDeclaration(expr)) => expr,
                        _ => return,
                    },
                    Statement::VariableDeclaration(expr) => expr,
                    _ => return,
                };

                match expr.declarations[0].id.get_identifier_name() {
                    Some(name) if name == format!("{router_name_camel_case}Routes") => {
                        // This is the one we want to delete, continue processing
                    }
                    _ => return, // Skip all others
                }

                let call = match &expr.declarations[0].init {
                    Some(Expression::CallExpression(call)) => call,
                    _ => return,
                };

                let identifier = match &call.callee {
                    Expression::Identifier(identifier) => identifier,
                    _ => return,
                };

                if identifier.name.contains("Routes") {
                    maybe_splice_pos = Some(index);
                }
            });
        maybe_splice_pos
    })?;
    delete_from_server_ts(server_program, |statements| {
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

            let arg = match &call.arguments[0] {
                Argument::Identifier(arg) => Some(arg),
                _ => None,
            };

            if id.name == "app" && member.property.name == "use" {
                if let Some(arg) = arg {
                    if &arg.name == format!("{router_name_camel_case}Routes").as_str() {
                        maybe_splice_pos = Some(index);
                    }
                }
            }
        });
        maybe_splice_pos
    })?;

    let _ = delete_import_statement(
        allocator,
        server_program,
        format!("./api/routes/{router_name_camel_case}.routes").as_str(),
    )?;

    Ok(CodeGenerator::new()
        .with_options(CodegenOptions::default())
        .build(&server_program)
        .code)
}

#[cfg(test)]
mod tests {
    use oxc_allocator::Allocator;
    use oxc_ast::ast::SourceType;
    use oxc_codegen::{CodeGenerator, CodegenOptions};

    use super::*;
    use crate::core::ast::parse_ast_program::parse_ast_program;

    fn create_test_server_ts_with_multiple_routers() -> &'static str {
        r#"import express from 'express';
import { ci } from './registrations';
import { openTelemetryCollector } from '@forklaunch/core';
import { UserRoutes } from './api/routes/user.routes';
import { OrderRoutes } from './api/routes/order.routes';
import { ProductRoutes } from './api/routes/product.routes';

const app = express();

const port = process.env.PORT || 3000;
const UserServiceFactory = ci.scopedResolver(tokens.UserService);
const OrderServiceFactory = ci.scopedResolver(tokens.OrderService);
const ProductServiceFactory = ci.scopedResolver(tokens.ProductService);

export const userRoutes = UserRoutes(() => ci.createScope(), UserServiceFactory, openTelemetryCollector);
export const orderRoutes = OrderRoutes(() => ci.createScope(), OrderServiceFactory, openTelemetryCollector);
export const productRoutes = ProductRoutes(() => ci.createScope(), ProductServiceFactory, openTelemetryCollector);

app.use(userRoutes);
app.use(orderRoutes);
app.use(productRoutes);

app.listen(port, () => {});
"#
    }

    fn create_test_server_ts_single_router() -> &'static str {
        r#"import express from 'express';
import { ci } from './registrations';
import { openTelemetryCollector } from '@forklaunch/core';
import { UserRoutes } from './api/routes/user.routes';

const app = express();

const port = process.env.PORT || 3000;
const UserServiceFactory = ci.scopedResolver(tokens.UserService);

export const userRoutes = UserRoutes(() => ci.createScope(), UserServiceFactory, openTelemetryCollector);

app.use(userRoutes);

app.listen(port, () => {});
"#
    }

    #[test]
    fn test_delete_from_server_ts_router_successful_deletion() {
        let allocator = Allocator::default();
        let server_content = create_test_server_ts_with_multiple_routers();
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        let result = delete_from_server_ts_router(&allocator, &mut server_program, "order");

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify the order router components are removed
        assert!(
            !transformed_code
                .contains("const OrderServiceFactory = ci.scopedResolver(tokens.OrderService);")
        );
        assert!(!transformed_code.contains("export const orderRoutes = OrderRoutes"));
        assert!(!transformed_code.contains("app.use(orderRoutes);"));
        assert!(
            !transformed_code
                .contains("import { OrderRoutes } from \"./api/routes/order.routes\";")
        );

        // Verify other routers are preserved
        assert!(
            transformed_code
                .contains("const UserServiceFactory = ci.scopedResolver(tokens.UserService);")
        );
        assert!(
            transformed_code.contains(
                "const ProductServiceFactory = ci.scopedResolver(tokens.ProductService);"
            )
        );
        assert!(transformed_code.contains("export const userRoutes = UserRoutes"));
        assert!(transformed_code.contains("export const productRoutes = ProductRoutes"));
        assert!(transformed_code.contains("app.use(userRoutes);"));
        assert!(transformed_code.contains("app.use(productRoutes);"));
        assert!(
            transformed_code.contains("import { UserRoutes } from \"./api/routes/user.routes\";")
        );
        assert!(
            transformed_code
                .contains("import { ProductRoutes } from \"./api/routes/product.routes\";")
        );

        // Verify basic structure is preserved
        assert!(transformed_code.contains("import express from \"express\";"));
        assert!(transformed_code.contains("const app = express();"));
        assert!(transformed_code.contains("app.listen(port"));
    }

    #[test]
    fn test_delete_from_server_ts_router_with_pascal_case_name() {
        let allocator = Allocator::default();
        let server_content = r#"import express from 'express';
import { ci } from './registrations';
import { openTelemetryCollector } from '@forklaunch/core';
import { UserManagementRoutes } from './api/routes/userManagement.routes';

const app = express();

const port = process.env.PORT || 3000;

const UserManagementServiceFactory = ci.scopedResolver(tokens.UserManagementService);

export const userManagementRoutes = UserManagementRoutes(() => ci.createScope(), UserManagementServiceFactory, openTelemetryCollector);

app.use(userManagementRoutes);
app.listen(port, () => {});
"#;
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        let result =
            delete_from_server_ts_router(&allocator, &mut server_program, "userManagement");

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify all UserManagement router components are removed
        assert!(!transformed_code.contains("const UserManagementServiceFactory"));
        assert!(!transformed_code.contains("export const userManagementRoutes"));
        assert!(!transformed_code.contains("app.use(userManagementRoutes);"));
        assert!(!transformed_code.contains("import { UserManagementRoutes }"));

        // Verify basic structure is preserved
        assert!(transformed_code.contains("import express from \"express\";"));
        assert!(transformed_code.contains("const app = express();"));
        assert!(transformed_code.contains("app.listen(port"));
    }

    #[test]
    fn test_delete_from_server_ts_router_with_kebab_case_name() {
        let allocator = Allocator::default();
        let server_content = r#"import express from 'express';
import { ci } from './registrations';
import { openTelemetryCollector } from '@forklaunch/core';
import { OrderProcessingRoutes } from './api/routes/orderProcessing.routes';

const app = express();

const port = process.env.PORT || 3000;

const OrderProcessingServiceFactory = ci.scopedResolver(tokens.OrderProcessingService);

export const orderProcessingRoutes = OrderProcessingRoutes(() => ci.createScope(), OrderProcessingServiceFactory, openTelemetryCollector);

app.use(orderProcessingRoutes);

app.listen(port, () => {});
"#;
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        let result =
            delete_from_server_ts_router(&allocator, &mut server_program, "order-processing");

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify all OrderProcessing router components are removed
        assert!(!transformed_code.contains("const OrderProcessingServiceFactory"));
        assert!(!transformed_code.contains("export const orderProcessingRoutes"));
        assert!(!transformed_code.contains("app.use(orderProcessingRoutes);"));
        assert!(!transformed_code.contains("import { OrderProcessingRoutes }"));

        // Verify basic structure is preserved
        assert!(transformed_code.contains("import express from \"express\";"));
        assert!(transformed_code.contains("const app = express();"));
        assert!(transformed_code.contains("app.listen(port"));
    }

    #[test]
    fn test_delete_from_server_ts_router_last_router() {
        let allocator = Allocator::default();
        let server_content = create_test_server_ts_single_router();
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        let result = delete_from_server_ts_router(&allocator, &mut server_program, "user");

        assert!(result.is_ok());

        let transformed_code = result.unwrap();

        // Verify the user router components are removed
        assert!(!transformed_code.contains("const UserServiceFactory"));
        assert!(!transformed_code.contains("export const userRoutes"));
        assert!(!transformed_code.contains("app.use(userRoutes);"));
        assert!(!transformed_code.contains("import { UserRoutes }"));

        // Verify basic structure is preserved
        assert!(transformed_code.contains("import express from \"express\";"));
        assert!(transformed_code.contains("const app = express();"));
        assert!(transformed_code.contains("app.listen(port"));
    }

    #[test]
    fn test_delete_from_server_ts_router_nonexistent_router() {
        let allocator = Allocator::default();
        let server_content = create_test_server_ts_with_multiple_routers();
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        let result = delete_from_server_ts_router(&allocator, &mut server_program, "nonexistent");

        // Should fail because the router doesn't exist
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("Failed to delete from server.ts")
        );
    }

    #[test]
    fn test_delete_from_server_ts_router_preserves_order() {
        let allocator = Allocator::default();
        let server_content = create_test_server_ts_with_multiple_routers();
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        let result = delete_from_server_ts_router(&allocator, &mut server_program, "order");

        assert!(result.is_ok());

        let transformed_code = result.unwrap();
        let lines: Vec<&str> = transformed_code.lines().collect();

        // Find indices of remaining components
        let user_factory_line = lines.iter().position(|&line| {
            line.contains("const UserServiceFactory = ci.scopedResolver(tokens.UserService);")
        });
        let product_factory_line = lines.iter().position(|&line| {
            line.contains("const ProductServiceFactory = ci.scopedResolver(tokens.ProductService);")
        });
        let user_routes_line = lines
            .iter()
            .position(|&line| line.contains("export const userRoutes = UserRoutes"));
        let product_routes_line = lines
            .iter()
            .position(|&line| line.contains("export const productRoutes = ProductRoutes"));

        // Verify order is preserved (user comes before product in original)
        assert!(user_factory_line.is_some());
        assert!(product_factory_line.is_some());
        assert!(user_routes_line.is_some());
        assert!(product_routes_line.is_some());

        assert!(user_factory_line.unwrap() < product_factory_line.unwrap());
        assert!(user_routes_line.unwrap() < product_routes_line.unwrap());
    }

    #[test]
    fn test_delete_from_server_ts_generic_function() {
        let allocator = Allocator::default();
        let server_content = r#"import express from 'express';

const app = express();

const firstStatement = "first";
const secondStatement = "second";
const thirdStatement = "third";

app.listen(3000, () => {});
"#;
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        // Delete the second statement (index 1)
        let result = delete_from_server_ts(&mut server_program, |statements| {
            statements.iter().enumerate().find_map(|(index, stmt)| {
                if let Statement::VariableDeclaration(expr) = stmt {
                    if let Some(id_name) = expr.declarations[0].id.get_identifier_name() {
                        if id_name == "secondStatement" {
                            return Some(index);
                        }
                    }
                }
                None
            })
        });

        assert!(result.is_ok());

        let transformed_code = CodeGenerator::new()
            .with_options(CodegenOptions::default())
            .build(&server_program)
            .code;

        // Verify the second statement is removed
        assert!(!transformed_code.contains("const secondStatement"));

        // Verify other statements are preserved
        assert!(transformed_code.contains("const firstStatement"));
        assert!(transformed_code.contains("const thirdStatement"));
    }

    #[test]
    fn test_delete_from_server_ts_no_match() {
        let allocator = Allocator::default();
        let server_content = r#"import express from 'express';

const app = express();

const statement = "test";

app.listen(3000, () => {});
"#;
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        // Try to delete a statement that doesn't exist
        let result = delete_from_server_ts(&mut server_program, |_statements| {
            None // Never return a position
        });

        // Should fail because no match was found
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("Failed to delete from server.ts")
        );
    }

    #[test]
    fn test_delete_from_server_ts_valid_deletion() {
        let allocator = Allocator::default();
        let server_content = r#"import express from 'express';

const app = express();
const port = 3000;
"#;
        let mut server_program = parse_ast_program(&allocator, server_content, SourceType::ts());

        // Delete the second statement (const app = express();)
        let result = delete_from_server_ts(&mut server_program, |_statements| {
            Some(1) // Delete the app declaration
        });

        // Should succeed
        assert!(result.is_ok());

        // Verify the statement was removed
        let transformed_code = CodeGenerator::new()
            .with_options(CodegenOptions::default())
            .build(&server_program)
            .code;

        assert!(!transformed_code.contains("const app = express();"));
        assert!(transformed_code.contains("import express from \"express\";"));
        assert!(transformed_code.contains("const port = 3e3;"));
    }
}
