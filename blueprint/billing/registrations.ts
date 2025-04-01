import {
  BaseBillingPortalService,
  BaseBillingPortalServiceSchemas,
  BaseCheckoutSessionService,
  BaseCheckoutSessionServiceSchemas,
  BasePaymentLinkService,
  BasePaymentLinkServiceSchemas,
  BasePlanService,
  BasePlanServiceSchemas,
  BaseSubscriptionService,
  BaseSubscriptionServiceSchemas
} from '@forklaunch/blueprint-billing-implementation-base';
import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { metrics } from '@forklaunch/blueprint-monitoring';
import { RedisTtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  createConfigInjector,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import {
  BillingPortalDtoMapper,
  CreateBillingPortalDtoMapper,
  UpdateBillingPortalDtoMapper
} from './models/dtoMapper/billingPortal.dtoMapper';
import {
  CheckoutSessionDtoMapper,
  CreateCheckoutSessionDtoMapper,
  UpdateCheckoutSessionDtoMapper
} from './models/dtoMapper/checkoutSession.dtoMapper';
import {
  CreatePaymentLinkDtoMapper,
  PaymentLinkDtoMapper,
  UpdatePaymentLinkDtoMapper
} from './models/dtoMapper/paymentLink.dtoMapper';
import {
  CreatePlanDtoMapper,
  PlanDtoMapper,
  UpdatePlanDtoMapper
} from './models/dtoMapper/plan.dtoMapper';
import {
  CreateSubscriptionDtoMapper,
  SubscriptionDtoMapper,
  UpdateSubscriptionDtoMapper
} from './models/dtoMapper/subscription.dtoMapper';
import { BillingProviderEnum } from './models/enum/billingProvider.enum';
import { CurrencyEnum } from './models/enum/currency.enum';
import { PartyEnum } from './models/enum/party.enum';
import { PaymentMethodEnum } from './models/enum/paymentMethod.enum';
import { PlanCadenceEnum } from './models/enum/planCadence.enum';

export const BillingPortalSchemas = BaseBillingPortalServiceSchemas(
  SchemaValidator(),
  true
);
export const CheckoutSessionSchemas = BaseCheckoutSessionServiceSchemas(
  SchemaValidator(),
  true
);
export const PaymentLinkSchemas = BasePaymentLinkServiceSchemas(
  SchemaValidator(),
  true
);
export const PlanSchemas = BasePlanServiceSchemas(SchemaValidator(), true);
export const SubscriptionSchemas = BaseSubscriptionServiceSchemas(
  SchemaValidator(),
  true
);
//! defines the configuration schema for the application
export function createDepenencies({ orm }: { orm: MikroORM }) {
  const environmentConfig = createConfigInjector(SchemaValidator(), {
    REDIS_URL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('REDIS_URL')
    },
    HOST: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('HOST')
    },
    PORT: {
      lifetime: Lifetime.Singleton,
      type: number,
      value: Number(getEnvVar('PORT'))
    },
    VERSION: {
      lifetime: Lifetime.Singleton,
      type: optional(string),
      value: getEnvVar('VERSION') ?? 'v1'
    },
    DOCS_PATH: {
      lifetime: Lifetime.Singleton,
      type: optional(string),
      value: getEnvVar('DOCS_PATH') ?? '/docs'
    },
    OTEL_SERVICE_NAME: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_SERVICE_NAME')
    },
    OTEL_LEVEL: {
      lifetime: Lifetime.Singleton,
      type: optional(string),
      value: getEnvVar('OTEL_LEVEL') ?? 'info'
    },
    OTEL_EXPORTER_OTLP_ENDPOINT: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT')
    },
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined)
    }
  });

  const runtimeDependencies = environmentConfig.chain({
    OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector,
      factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
        new OpenTelemetryCollector(
          OTEL_SERVICE_NAME,
          OTEL_LEVEL || 'info',
          metrics
        )
    },
    TtlCache: {
      lifetime: Lifetime.Singleton,
      type: RedisTtlCache,
      factory: ({ REDIS_URL, OpenTelemetryCollector }) =>
        new RedisTtlCache(60 * 60 * 1000, OpenTelemetryCollector, {
          url: REDIS_URL
        })
    }
  });

  const serviceDependencies = runtimeDependencies.chain({
    BillingPortalService: {
      lifetime: Lifetime.Scoped,
      type: BaseBillingPortalService,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseBillingPortalService(TtlCache, OpenTelemetryCollector, {
          BillingPortalDtoMapper,
          CreateBillingPortalDtoMapper,
          UpdateBillingPortalDtoMapper
        })
    },
    CheckoutSessionService: {
      lifetime: Lifetime.Scoped,
      type: BaseCheckoutSessionService<typeof PaymentMethodEnum>,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseCheckoutSessionService(
          TtlCache,
          OpenTelemetryCollector,
          PaymentMethodEnum,
          {
            CheckoutSessionDtoMapper,
            CreateCheckoutSessionDtoMapper,
            UpdateCheckoutSessionDtoMapper
          }
        )
    },
    PaymentLinkService: {
      lifetime: Lifetime.Scoped,
      type: BasePaymentLinkService<typeof CurrencyEnum>,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BasePaymentLinkService(TtlCache, OpenTelemetryCollector, {
          PaymentLinkDtoMapper,
          CreatePaymentLinkDtoMapper,
          UpdatePaymentLinkDtoMapper
        })
    },
    PlanService: {
      lifetime: Lifetime.Scoped,
      type: BasePlanService<typeof PlanCadenceEnum, typeof BillingProviderEnum>,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BasePlanService(EntityManager, OpenTelemetryCollector, {
          PlanDtoMapper,
          CreatePlanDtoMapper,
          UpdatePlanDtoMapper
        })
    },
    SubscriptionService: {
      lifetime: Lifetime.Scoped,
      type: BaseSubscriptionService<
        typeof PartyEnum,
        typeof BillingProviderEnum
      >,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BaseSubscriptionService(EntityManager, OpenTelemetryCollector, {
          SubscriptionDtoMapper,
          CreateSubscriptionDtoMapper,
          UpdateSubscriptionDtoMapper
        })
    }
  });

  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens()
  };
}

export type ServiceDependencies = ReturnType<
  typeof createDepenencies
>['serviceDependencies']['configShapes'];
