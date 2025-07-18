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
  StripeBillingPortalServiceSchemas,
  StripeCheckoutSessionServiceSchemas,
  StripePaymentLinkServiceSchemas,
  StripePlanServiceSchemas,
  StripeSubscriptionServiceSchemas
} from '@forklaunch/implementation-billing-stripe/schemas';
import {
  StripeBillingPortalService,
  StripeCheckoutSessionService,
  StripePaymentLinkService,
  StripePlanService,
  StripeSubscriptionService,
  StripeWebhookService
} from '@forklaunch/implementation-billing-stripe/services';
import { RedisTtlCache } from '@forklaunch/infrastructure-redis';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import Stripe from 'stripe';
import { PartyEnum } from './domain/enum/party.enum';
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
  BillingPortalEntities,
  CheckoutSessionEntities,
  PaymentLinkEntities,
  PlanEntities,
  SubscriptionEntities
} from './domain/types/mapperEntities.types';
import mikroOrmOptionsConfig from './mikro-orm.config';

//! defines the schemas for the billing portal service
export const BillingPortalSchemas = StripeBillingPortalServiceSchemas({
  validator: SchemaValidator()
});
export const CheckoutSessionSchemas = StripeCheckoutSessionServiceSchemas({
  validator: SchemaValidator()
});
export const PaymentLinkSchemas = StripePaymentLinkServiceSchemas({
  validator: SchemaValidator()
});
export const PlanSchemas = StripePlanServiceSchemas({
  validator: SchemaValidator()
});
export const SubscriptionSchemas = StripeSubscriptionServiceSchemas({
  validator: SchemaValidator()
});
//! defines the configuration schema for the application
export function createDependencies() {
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
    },
    STRIPE_API_KEY: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('STRIPE_API_KEY')
    }
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    StripeClient: {
      lifetime: Lifetime.Singleton,
      type: Stripe,
      factory: ({ STRIPE_API_KEY }) => new Stripe(STRIPE_API_KEY)
    },
    MikroORM: {
      lifetime: Lifetime.Singleton,
      type: MikroORM,
      factory: () => MikroORM.initSync(mikroOrmOptionsConfig)
    },
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
      factory: ({ MikroORM }, _resolve, context) =>
        MikroORM.em.fork(
          context?.entityManagerOptions as ForkOptions | undefined
        )
    }
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({
    BillingPortalService: {
      lifetime: Lifetime.Scoped,
      type: StripeBillingPortalService<SchemaValidator, BillingPortalEntities>,
      factory: ({
        StripeClient,
        EntityManager,
        TtlCache,
        OpenTelemetryCollector
      }) =>
        new StripeBillingPortalService(
          StripeClient,
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
      type: StripeCheckoutSessionService<
        SchemaValidator,
        typeof StatusEnum,
        CheckoutSessionEntities
      >,
      factory: ({
        StripeClient,
        EntityManager,
        TtlCache,
        OpenTelemetryCollector
      }) =>
        new StripeCheckoutSessionService(
          StripeClient,
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
      type: StripePaymentLinkService<
        SchemaValidator,
        typeof StatusEnum,
        PaymentLinkEntities
      >,
      factory: ({
        StripeClient,
        EntityManager,
        TtlCache,
        OpenTelemetryCollector
      }) =>
        new StripePaymentLinkService(
          StripeClient,
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
      type: StripePlanService<SchemaValidator, PlanEntities>,
      factory: ({ StripeClient, EntityManager, OpenTelemetryCollector }) =>
        new StripePlanService(
          StripeClient,
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
      type: StripeSubscriptionService<
        SchemaValidator,
        typeof PartyEnum,
        SubscriptionEntities
      >,
      factory: ({ StripeClient, EntityManager, OpenTelemetryCollector }) =>
        new StripeSubscriptionService(
          StripeClient,
          EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            SubscriptionMapper,
            CreateSubscriptionMapper,
            UpdateSubscriptionMapper
          }
        )
    },
    WebhookService: {
      lifetime: Lifetime.Scoped,
      type: StripeWebhookService<
        SchemaValidator,
        typeof StatusEnum,
        typeof PartyEnum,
        BillingPortalEntities,
        CheckoutSessionEntities,
        PaymentLinkEntities,
        PlanEntities,
        SubscriptionEntities
      >,
      factory: ({
        StripeClient,
        EntityManager,
        OpenTelemetryCollector,
        BillingPortalService,
        CheckoutSessionService,
        PaymentLinkService,
        PlanService,
        SubscriptionService
      }) =>
        new StripeWebhookService(
          StripeClient,
          EntityManager,
          SchemaValidator(),
          OpenTelemetryCollector,
          BillingPortalService,
          CheckoutSessionService,
          PaymentLinkService,
          PlanService,
          SubscriptionService
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
