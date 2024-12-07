import { RedisTtlCache } from '@forklaunch/core/cache';
import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { BaseCheckoutSessionService } from './services/checkoutSession.service';
import { BasePaymentLinkService } from './services/paymentLink.service';
import { BasePlanService } from './services/plan.service';
import { BaseSubscriptionService } from './services/subscription.service';

const configValidator = {
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
    callback(configInjector);
  });
}
