use oxc_allocator::Allocator;
use oxc_ast::ast::{Program, SourceType};

use crate::core::ast::{
    injections::inject_into_registrations_ts::inject_into_registrations_config_injector,
    parse_ast_program::parse_ast_program,
};

pub(crate) fn kafka_url_environment_variable<'a>(
    allocator: &'a Allocator,
    registrations_program: &mut Program<'a>,
) {
    let kafka_env_var_text = "const configInjector = createConfigInjector(SchemaValidator(), {
            KAFKA_BROKERS: {
                lifetime: Lifetime.Singleton,
                type: array(string),
                value: getEnvVar('KAFKA_BROKERS').split(',')
            },
            KAFKA_CLIENT_ID: {
              lifetime: Lifetime.Singleton,
              type: string,
              value: getEnvVar('KAFKA_CLIENT_ID')
            },
	          KAFKA_GROUP_ID: {
		          lifetime: Lifetime.Singleton,
		          type: string,
              value: getEnvVar('KAFKA_GROUP_ID')
            }
        });";

    let mut kafka_env_var_program =
        parse_ast_program(&allocator, &kafka_env_var_text, SourceType::ts());

    inject_into_registrations_config_injector(
        &allocator,
        registrations_program,
        &mut kafka_env_var_program,
        "environmentConfig",
    );
}
