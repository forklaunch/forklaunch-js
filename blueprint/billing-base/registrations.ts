import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics, metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import {
  BaseBillingPortalServiceSchemas,
  BaseCheckoutSessionServiceSchemas,
  BasePaymentLinkServiceSchemas,
  BasePlanServiceSchemas,
  BaseSubscriptionServiceSchemas
} from '@forklaunch/implementation-billing-base/schemas';
import {
  BaseBillingPortalService,
  BaseCheckoutSessionService,
  BasePaymentLinkService,
  BasePlanService,
  BaseSubscriptionService
} from '@forklaunch/implementation-billing-base/services';
import { RedisTtlCache } from '@forklaunch/infrastructure-redis';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { BillingProviderEnum } from './domain/enum/billingProvider.enum';
import { CurrencyEnum } from './domain/enum/currency.enum';
import { PartyEnum } from './domain/enum/party.enum';
import { PaymentMethodEnum } from './domain/enum/paymentMethod.enum';
import { PlanCadenceEnum } from './domain/enum/planCadence.enum';
import { StatusEnum } from './domain/enum/status.enum';
import {
  BillingPortalMapper,
  CreateBillingPortalMapper,
  UpdateBillingPortalMapper
} from './domain/mappers/billingPortal.mappers';
import {
  CheckoutSessionMapper,
  CreateCheckoutSessionMapper,
  UpdateCheckoutSessionMapper
} from './domain/mappers/checkoutSession.mappers';
import {
  CreatePaymentLinkMapper,
  PaymentLinkMapper,
  UpdatePaymentLinkMapper
} from './domain/mappers/paymentLink.mappers';
import {
  CreatePlanMapper,
  PlanMapper,
  UpdatePlanMapper
} from './domain/mappers/plan.mappers';
import {
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from './domain/mappers/subscription.mappers';
import {
  BillingPortal,
  CheckoutSession,
  PaymentLink,
  Plan,
  Subscription
} from './persistence/entities';
//! defines the schemas for the billing portal service
export const BillingPortalSchemas = BaseBillingPortalServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const CheckoutSessionSchemas = BaseCheckoutSessionServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const PaymentLinkSchemas = BasePaymentLinkServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const PlanSchemas = BasePlanServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const SubscriptionSchemas = BaseSubscriptionServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
//! defines the configuration schema for the application
export function createDependencies(orm: MikroORM) {
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
      type: OpenTelemetryCollector<Metrics>,
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
      factory: ({ REDIS_URL, OpenTelemetryCollector, OTEL_LEVEL }) =>
        new RedisTtlCache(
          60 * 60 * 1000,
          OpenTelemetryCollector,
          {
            url: REDIS_URL
          },
          {
            enabled: true,
            level: OTEL_LEVEL || 'info'
          }
        )
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
      type: BaseBillingPortalService<
        SchemaValidator,
        {
          BillingPortalMapper: BillingPortal;
          CreateBillingPortalMapper: BillingPortal;
          UpdateBillingPortalMapper: BillingPortal;
        }
      >,
      factory: ({ EntityManager, TtlCache, OpenTelemetryCollector }) =>
        new BaseBillingPortalService(
          EntityManager,
          TtlCache,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            BillingPortalMapper,
            CreateBillingPortalMapper,
            UpdateBillingPortalMapper
          }
        )
    },
    CheckoutSessionService: {
      lifetime: Lifetime.Scoped,
      type: BaseCheckoutSessionService<
        SchemaValidator,
        typeof PaymentMethodEnum,
        typeof CurrencyEnum,
        typeof StatusEnum,
        {
          CheckoutSessionMapper: CheckoutSession;
          CreateCheckoutSessionMapper: CheckoutSession;
          UpdateCheckoutSessionMapper: CheckoutSession;
        }
      >,
      factory: ({ EntityManager, TtlCache, OpenTelemetryCollector }) =>
        new BaseCheckoutSessionService(
          EntityManager,
          TtlCache,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            CheckoutSessionMapper,
            CreateCheckoutSessionMapper,
            UpdateCheckoutSessionMapper
          }
        )
    },
    PaymentLinkService: {
      lifetime: Lifetime.Scoped,
      type: BasePaymentLinkService<
        SchemaValidator,
        typeof PaymentMethodEnum,
        typeof CurrencyEnum,
        typeof StatusEnum,
        {
          PaymentLinkMapper: PaymentLink;
          CreatePaymentLinkMapper: PaymentLink;
          UpdatePaymentLinkMapper: PaymentLink;
        }
      >,
      factory: ({ EntityManager, TtlCache, OpenTelemetryCollector }) =>
        new BasePaymentLinkService(
          EntityManager,
          TtlCache,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            PaymentLinkMapper,
            CreatePaymentLinkMapper,
            UpdatePaymentLinkMapper
          }
        )
    },
    PlanService: {
      lifetime: Lifetime.Scoped,
      type: BasePlanService<
        SchemaValidator,
        typeof PlanCadenceEnum,
        typeof CurrencyEnum,
        typeof BillingProviderEnum,
        {
          PlanMapper: Plan;
          CreatePlanMapper: Plan;
          UpdatePlanMapper: Plan;
        }
      >,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BasePlanService(
          EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            PlanMapper,
            CreatePlanMapper,
            UpdatePlanMapper
          }
        )
    },
    SubscriptionService: {
      lifetime: Lifetime.Scoped,
      type: BaseSubscriptionService<
        SchemaValidator,
        typeof PartyEnum,
        typeof BillingProviderEnum,
        {
          SubscriptionMapper: Subscription;
          CreateSubscriptionMapper: Subscription;
          UpdateSubscriptionMapper: Subscription;
        }
      >,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BaseSubscriptionService(
          EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            SubscriptionMapper,
            CreateSubscriptionMapper,
            UpdateSubscriptionMapper
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
export type SchemaDependencies = DependencyShapes<typeof createDependencies>;
