import {
  IdDtoSchema,
  IdsDtoSchema,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';

import { number } from '@forklaunch/blueprint-core';
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
  CreateCheckoutSessionDtoMapper
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
import { BaseBillingPortalService } from './services/billingPortal.service';
import { BaseCheckoutSessionService } from './services/checkoutSession.service';
import { BasePaymentLinkService } from './services/paymentLink.service';
import { BasePlanService } from './services/plan.service';
import { BaseSubscriptionService } from './services/subscription.service';

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
        new BaseBillingPortalService(TtlCache, OpenTelemetryCollector),
      schemas: {
        CreateBillingPortalDto: CreateBillingPortalDtoMapper.schema(),
        UpdateBillingPortalDto: UpdateBillingPortalDtoMapper.schema(),
        BillingPortalDto: BillingPortalDtoMapper.schema(),
        IdDto: IdDtoSchema
      }
    },
    CheckoutSessionService: {
      lifetime: Lifetime.Scoped,
      type: BaseCheckoutSessionService,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseCheckoutSessionService(TtlCache, OpenTelemetryCollector),
      schemas: {
        CreateCheckoutSessionDto: CreateCheckoutSessionDtoMapper.schema(),
        CheckoutSessionDto: CheckoutSessionDtoMapper.schema(),
        IdDto: IdDtoSchema
      }
    },
    PaymentLinkService: {
      lifetime: Lifetime.Scoped,
      type: BasePaymentLinkService,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BasePaymentLinkService(TtlCache, OpenTelemetryCollector),
      schemas: {
        CreatePaymentLinkDto: CreatePaymentLinkDtoMapper.schema(),
        UpdatePaymentLinkDto: UpdatePaymentLinkDtoMapper.schema(),
        PaymentLinkDto: PaymentLinkDtoMapper.schema(),
        IdDto: IdDtoSchema,
        IdsDto: IdsDtoSchema
      }
    },
    PlanService: {
      lifetime: Lifetime.Scoped,
      type: BasePlanService,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BasePlanService(EntityManager, OpenTelemetryCollector),
      schemas: {
        CreatePlanDto: CreatePlanDtoMapper.schema(),
        UpdatePlanDto: UpdatePlanDtoMapper.schema(),
        PlanDto: PlanDtoMapper.schema(),
        IdDto: IdDtoSchema,
        IdsDto: IdsDtoSchema
      }
    },
    SubscriptionService: {
      lifetime: Lifetime.Scoped,
      type: BaseSubscriptionService,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BaseSubscriptionService(EntityManager, OpenTelemetryCollector),
      schemas: {
        CreateSubscriptionDto: CreateSubscriptionDtoMapper.schema(),
        UpdateSubscriptionDto: UpdateSubscriptionDtoMapper.schema(),
        SubscriptionDto: SubscriptionDtoMapper.schema(),
        IdDto: IdDtoSchema,
        IdsDto: IdsDtoSchema
      }
    }
  });

  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens(),
    serviceSchemas: serviceDependencies.serviceSchemas()
  };
}

export type ServiceDependencies = ReturnType<
  typeof createDepenencies
>['serviceDependencies']['configShapes'];

export type ServiceSchemas = ReturnType<
  typeof createDepenencies
>['serviceSchemas'];
