import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { BaseSampleWorkerService } from './services/sampleWorker.service';
//! configValidator object that defines the configuration schema for the application
export const configValidator = {
  redisUrl: string,
  protocol: string,
  host: string,
  port: number,
  version: optional(string),
  docsPath: optional(string),
  entityManager: EntityManager,
  ttlCache: RedisTtlCache,
  sampleWorkerService: BaseSampleWorkerService
};
//! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });
  //! initializes the MikroORM instance with the mikroOrmOptionsConfig
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    //! creates a new ConfigInjector instance with the SchemaValidator, configValidator, and the configuration for the application
    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
        redisUrl: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('REDIS_URL')
        },
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
            url: getEnvVar('REDIS_URL')
          })
        },
        sampleWorkerService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, ttlCache }) =>
            new BaseSampleWorkerService(entityManager, ttlCache)
        }
      }
    );
    callback(
      configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH'))
    );
  });
}
