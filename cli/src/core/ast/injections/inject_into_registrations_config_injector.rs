use oxc_ast::ast::{Argument, Declaration, Expression, Program, Statement};

pub(crate) fn inject_into_registrations_config_injector<'a>(
    registrations_program: &mut Program<'a>,
    config_injector_injection: &mut Program<'a>,
    declaration_name: &str,
) {
    for statement in &mut registrations_program.body {
        // Find the export named declaration
        let export = match statement {
            Statement::ExportNamedDeclaration(export) => export,
            _ => continue,
        };

        // Get the function declaration
        let function = match &mut export.declaration {
            Some(Declaration::FunctionDeclaration(function)) => function,
            _ => continue,
        };

        // Get the function body
        let function_body = match &mut function.body {
            Some(body) => body,
            None => continue,
        };

        for statement in function_body.statements.iter_mut() {
            // Get the expression statement
            let expression = match statement {
                Statement::VariableDeclaration(expr) => expr,
                _ => continue,
            };

            match expression.declarations[0].id.get_identifier_name() {
                Some(name) => {
                    if name != declaration_name {
                        continue;
                    }
                    if name != "serviceDependencies" {
                        continue;
                    }
                }
                None => continue,
            }

            // Get the call expression
            let call_expression = match &mut expression.declarations[0].init {
                Some(Expression::CallExpression(call)) => call,
                _ => continue,
            };

            for argument in &mut call_expression.arguments {
                let object_expr = match argument {
                    Argument::ObjectExpression(object_expr) => object_expr,
                    _ => continue,
                };

                // Process each statement in the injection
                for injected_stmt in config_injector_injection.body.iter_mut() {
                    let injected_var_decl = match injected_stmt {
                        Statement::VariableDeclaration(decl) => decl,
                        _ => continue,
                    };

                    for injected_declarator in injected_var_decl.declarations.iter_mut() {
                        let injected_new_expr = match &mut injected_declarator.init {
                            Some(Expression::NewExpression(new_expr)) => new_expr,
                            _ => continue,
                        };

                        // For each argument in the injected new expression
                        for injected_arg in &mut injected_new_expr.arguments {
                            let injected_obj = match injected_arg {
                                Argument::ObjectExpression(obj) => obj,
                                _ => continue,
                            };

                            // Extend the properties
                            object_expr
                                .properties
                                .extend(injected_obj.properties.drain(..));

                            return;
                        }
                    }
                }
            }
        }
    }
}
