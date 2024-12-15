import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { SchemaValidator, number, optional, string } from '@{{app_name}}/core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { BaseHelloForklaunchService } from './services/helloForklaunch.service';

// configValidator object that defines the configuration schema for the application
export const configValidator = {
  redisUrl: string,
  protocol: optional(string),
  host: optional(string),
  port: optional(number),
  version: optional(string),
  swaggerPath: optional(string),
  entityManager: EntityManager,
  ttlCache: RedisTtlCache,
  helloForklaunchService: BaseHelloForklaunchService
};

// bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  // initializes the MikroORM instance with the mikroOrmOptionsConfig
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    // creates a new ConfigInjector instance with the SchemaValidator, configValidator, and the configuration for the application
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
        swaggerPath: {
          lifetime: Lifetime.Singleton,
          value: process.env.SWAGGER_PATH ?? '/swagger'
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
        helloForklaunchService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, ttlCache }) =>
            new BaseHelloForklaunchService(entityManager, ttlCache)
        }
      }
    );

    // validates the configuration singletons
    const parsedConfig = configInjector.validateConfigSingletons({
      redisUrl: process.env.REDIS_URL
    });

    if (!parsedConfig.ok) {
      throw new Error(parsedConfig.error);
    }

    // calls the callback function with the configInjector instance
    callback(configInjector);
  });
}
