import { RedisTtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { metrics } from '@forklaunch/framework-monitoring';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
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
  docsPath: optional(string),
  entityManager: EntityManager,
  openTelemetryCollector: OpenTelemetryCollector,
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
    dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

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
        openTelemetryCollector: {
          lifetime: Lifetime.Singleton,
          value: new OpenTelemetryCollector(
            getEnvVar('OTEL_SERVICE_NAME'),
            getEnvVar('OTEL_LEVEL') || 'info',
            metrics
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
          factory: ({ ttlCache, openTelemetryCollector }) =>
            new BaseCheckoutSessionService(ttlCache, openTelemetryCollector)
        },
        paymentLinkService: {
          lifetime: Lifetime.Scoped,
          factory: ({ ttlCache, openTelemetryCollector }) =>
            new BasePaymentLinkService(ttlCache, openTelemetryCollector)
        },
        planService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, openTelemetryCollector }) =>
            new BasePlanService(entityManager, openTelemetryCollector)
        },
        subscriptionService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, openTelemetryCollector }) =>
            new BaseSubscriptionService(entityManager, openTelemetryCollector)
        }
      }
    );
    callback(
      configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH'))
    );
  });
}
