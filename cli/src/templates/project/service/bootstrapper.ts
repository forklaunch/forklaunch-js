import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { SchemaValidator, number, optional, string } from '@{{app_name}}/core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { BaseHelloForklaunchService } from './services/helloForklaunch.service';

const configValidator = {
  host: string,
  port: number,
  version: optional(string),
  swaggerPath: optional(string),
  entityManager: EntityManager,
  ttlCache: RedisTtlCache,
  helloForklaunchService: BaseHelloForklaunchService
};

export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
        host: {
          lifetime: Lifetime.Singleton,
          value: process.env.DB_HOST ?? 'localhost'
        },
        port: {
          lifetime: Lifetime.Singleton,
          value: Number(process.env.DB_PORT ?? "8000")
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
          value: new RedisTtlCache(60 * 60 * 1000)
        },
        helloForklaunchService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, ttlCache }) =>
            new BaseHelloForklaunchService(entityManager, ttlCache)
        }
      }
    );
    callback(configInjector);
  });
}
