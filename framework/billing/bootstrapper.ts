import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { BaseCheckoutSessionService } from './services/checkoutSession.service';
import { BasePaymentLinkService } from './services/paymentLink.service';
import { BasePlanService } from './services/plan.service';
import { BaseSubscriptionService } from './services/subscription.service';
//! defines the configuration schema for the application
export const configValidator = {
  redisUrl: string,
  host: string,
  port: number,
  version: optional(string),
  swaggerPath: optional(string),
  entityManager: EntityManager,
  ttlCache: RedisTtlCache,
  checkoutSessionService: BaseCheckoutSessionService,
  paymentLinkService: BasePaymentLinkService,
  planService: BasePlanService,
  subscriptionService: BaseSubscriptionService
};
//! bootstrap function that initializes the application
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
        redisUrl: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('REDIS_URL')
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
          value: getEnvVar('VERSION')
        },
        swaggerPath: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('SWAGGER_PATH')
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
        checkoutSessionService: {
          lifetime: Lifetime.Scoped,
          factory: ({ ttlCache }) => new BaseCheckoutSessionService(ttlCache)
        },
        paymentLinkService: {
          lifetime: Lifetime.Scoped,
          factory: ({ ttlCache }) => new BasePaymentLinkService(ttlCache)
        },
        planService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager }) => new BasePlanService(entityManager)
        },
        subscriptionService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager }) =>
            new BaseSubscriptionService(entityManager)
        }
      }
    );
    callback(
      configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH'))
    );
  });
}
