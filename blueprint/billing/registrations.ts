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
} from '@forklaunch/implementation-billing-base';
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
  DependencyShapes,
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
//! defines the schemas for the billing portal service
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
  const configInjector = createConfigInjector(SchemaValidator(), {
    SERVICE_METADATA: {
      lifetime: Lifetime.Singleton,
      type: {
        name: string,
        version: string
      },
      value: {
        name: 'billing',
        version: '0.1.0'
      }
    }
  });
  //! defines the environment configuration for the application
  const environmentConfig = configInjector.chain({
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
    }
  });
  //! defines the runtime dependencies for the application
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
    },
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined)
    }
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({
    BillingPortalService: {
      lifetime: Lifetime.Scoped,
      type: BaseBillingPortalService<SchemaValidator>,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseBillingPortalService(
          TtlCache,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            BillingPortalDtoMapper,
            CreateBillingPortalDtoMapper,
            UpdateBillingPortalDtoMapper
          }
        )
    },
    CheckoutSessionService: {
      lifetime: Lifetime.Scoped,
      type: BaseCheckoutSessionService<
        SchemaValidator,
        typeof PaymentMethodEnum
      >,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseCheckoutSessionService(
          TtlCache,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            CheckoutSessionDtoMapper,
            CreateCheckoutSessionDtoMapper,
            UpdateCheckoutSessionDtoMapper
          }
        )
    },
    PaymentLinkService: {
      lifetime: Lifetime.Scoped,
      type: BasePaymentLinkService<SchemaValidator, typeof CurrencyEnum>,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BasePaymentLinkService(
          TtlCache,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            PaymentLinkDtoMapper,
            CreatePaymentLinkDtoMapper,
            UpdatePaymentLinkDtoMapper
          }
        )
    },
    PlanService: {
      lifetime: Lifetime.Scoped,
      type: BasePlanService<
        SchemaValidator,
        typeof PlanCadenceEnum,
        typeof BillingProviderEnum
      >,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BasePlanService(
          EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            PlanDtoMapper,
            CreatePlanDtoMapper,
            UpdatePlanDtoMapper
          }
        )
    },
    SubscriptionService: {
      lifetime: Lifetime.Scoped,
      type: BaseSubscriptionService<
        SchemaValidator,
        typeof PartyEnum,
        typeof BillingProviderEnum
      >,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BaseSubscriptionService(
          EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            SubscriptionDtoMapper,
            CreateSubscriptionDtoMapper,
            UpdateSubscriptionDtoMapper
          }
        )
    }
  });
  //! returns the various dependencies for the application
  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens()
  };
}
//! defines the type for the service dependencies
export type SchemaDependencies = DependencyShapes<typeof createDepenencies>;
