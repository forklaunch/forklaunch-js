import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { SchemaValidator, number, optional, string } from '@{{app_name}}/core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { Base{{pascal_case_name}}Service } from './services/{{camel_case_name}}.service';
//! configValidator object that defines the configuration schema for the application
export const configValidator = {
  redisUrl: string,
  protocol: optional(string),
  host: optional(string),
  port: optional(number),
  version: optional(string),
  docsPath: optional(string),
  entityManager: EntityManager,
  ttlCache: RedisTtlCache,
  {{camel_case_name}}Service: Base{{pascal_case_name}}Service
};
//! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  //! initializes the MikroORM instance with the mikroOrmOptionsConfig
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    //! creates a new ConfigInjector instance with the SchemaValidator, configValidator, and the configuration for the application
    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
        redisUrl: {
          lifetime: Lifetime.Singleton,
          value: process.env.REDIS_URL ?? ''
        },
        protocol: {
          lifetime: Lifetime.Singleton,
          value: process.env.PROTOCOL ?? 'http'
        },
        host: {
          lifetime: Lifetime.Singleton,
          value: process.env.HOST ?? 'localhost'
        },
        port: {
          lifetime: Lifetime.Singleton,
          value: Number(process.env.PORT ?? "8000")
        },
        version: {
          lifetime: Lifetime.Singleton,
          value: process.env.VERSION ?? '/v1'
        },
        docsPath: {
          lifetime: Lifetime.Singleton,
          value: process.env.DOCS_PATH ?? '/docs'
        },
        entityManager: {
          lifetime: Lifetime.Scoped,
          factory: (_args, _resolve, context) =>
            orm.em.fork(
              context?.entityManagerOptions as ForkOptions | undefined
            )
        },
        ttlCache: {
          lifetime: Lifetime.Singleton,
          value: new RedisTtlCache(60 * 60 * 1000, {
            url: process.env.REDIS_URL ?? ''
          })
        },
        {{camel_case_name}}Service: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, ttlCache }) =>
            new Base{{pascal_case_name}}Service(entityManager, ttlCache)
        }
      }
    );
    callback(configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH')));
  });
}
