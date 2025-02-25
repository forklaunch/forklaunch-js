import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
{{^cache_backend}}import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';{{/cache_backend}}
import { number, optional, SchemaValidator, string } from '@{{app_name}}/core';
import dotenv from 'dotenv';
{{^cache_backend}}import mikroOrmOptionsConfig from './mikro-orm.config';{{/cache_backend}}
import { Base{{pascal_case_name}}Service } from './services/{{camel_case_name}}.service';
//! configValidator object that defines the configuration schema for the application
export const configValidator = {
  {{#cache_backend}}redisUrl: string,{{/cache_backend}}
  protocol: string,
  host: string,
  port: number,
  version: optional(string),
  docsPath: optional(string),
  {{^cache_backend}}entityManager: EntityManager,{{/cache_backend}}{{#cache_backend}}
  ttlCache: RedisTtlCache,{{/cache_backend}}
  {{camel_case_name}}Service: Base{{pascal_case_name}}Service
};
//! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });
  //! initializes the MikroORM instance with the mikroOrmOptionsConfig
  {{^cache_backend}}MikroORM.init(mikroOrmOptionsConfig).then((orm) => { {{/cache_backend}}
    //! creates a new ConfigInjector instance with the SchemaValidator, configValidator, and the configuration for the application
    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
        {{#cache_backend}}redisUrl: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('REDIS_URL')
        },{{/cache_backend}}
        protocol: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('PROTOCOL')
        },
        host: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('HOST')
        },
        port: {
          lifetime: Lifetime.Singleton,
          value: Number(getEnvVar('PORT'))
        },
        version: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('VERSION') ?? 'v1'
        },
        docsPath: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('DOCS_PATH') ?? '/docs'
        },{{^cache_backend}}
        entityManager: {
          lifetime: Lifetime.Scoped,
          factory: (_args, _resolve, context) =>
            orm.em.fork(
              context?.entityManagerOptions as ForkOptions | undefined
            )
        },{{/cache_backend}}{{#cache_backend}}
        ttlCache: {
          lifetime: Lifetime.Singleton,
          value: new RedisTtlCache(60 * 60 * 1000, {
            url: getEnvVar('REDIS_URL')
          })
        },{{/cache_backend}}
        {{camel_case_name}}Service: {
          lifetime: Lifetime.Scoped,
          factory: ({ {{^cache_backend}}entityManager{{/cache_backend}}{{#cache_backend}}ttlCache{{/cache_backend}} }) =>
            new Base{{pascal_case_name}}Service({{^cache_backend}}entityManager{{/cache_backend}}{{#cache_backend}}ttlCache{{/cache_backend}})
        }
      }
    );
    callback(configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH')));
 {{^cache_backend}} });{{/cache_backend}}
}
