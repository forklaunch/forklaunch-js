import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
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

const configValidator = {
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
          value: process.env.REDIS_URL ?? ''
        },
        host: {
          lifetime: Lifetime.Singleton,
          value: process.env.HOST ?? 'localhost'
        },
        port: {
          lifetime: Lifetime.Singleton,
          value: Number(process.env.PORT ?? '8000')
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

    if (
      !configInjector.validateConfigSingletons({
        redisUrl: process.env.REDIS_URL
      })
    ) {
      throw new Error('Invalid environment variables supplied.');
    }

    callback(configInjector);
  });
}
