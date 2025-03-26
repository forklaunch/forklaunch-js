import {
  array,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Schema, UnboxedObjectSchema } from '@forklaunch/validator';
import {
  BaseCheckoutSessionServiceParameters,
  CheckoutSessionServiceName
} from './interfaces/checkoutSession.service.interface';
import {
  BasePaymentLinkServiceParameters,
  PaymentLinkServiceName
} from './interfaces/paymentLink.service.interface';
import {
  BasePlanServiceParameters,
  PlanServiceName
} from './interfaces/plan.service.interface';
import {
  BaseSubscriptionServiceParameters,
  SubscriptionServiceName
} from './interfaces/subscription.service.interface';
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

import { number } from '@forklaunch/blueprint-core';
import { metrics } from '@forklaunch/blueprint-monitoring';
import { RedisTtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import {
  BaseBillingPortalServiceParameters,
  BillingPortalServiceName
} from './interfaces/billingPortal.service.interface';
import {
  BillingPortalDtoMapper,
  CreateBillingPortalDtoMapper,
  UpdateBillingPortalDtoMapper
} from './models/dtoMapper/billingPortal.dtoMapper';
import { BaseBillingPortalService } from './services/billingPortal.service';
import { BaseCheckoutSessionService } from './services/checkoutSession.service';
import { BasePaymentLinkService } from './services/paymentLink.service';
import { BasePlanService } from './services/plan.service';
import { BaseSubscriptionService } from './services/subscription.service';

function validateSchemas<T extends UnboxedObjectSchema<SchemaValidator>>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _baseSchema: T
) {
  return function <U extends UnboxedObjectSchema<SchemaValidator>>(
    schemas: U extends T ? U : T
  ) {
    return schemas;
  };
}

function isDtoRegistration(schema: unknown): schema is {
  base: UnboxedObjectSchema<SchemaValidator>;
  implementation: UnboxedObjectSchema<SchemaValidator>;
} {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'base' in schema &&
    'implementation' in schema
  );
}

function schemaRegistrations<
  T extends {
    [K in keyof T]: {
      base: T[K]['base'] extends UnboxedObjectSchema<SchemaValidator>
        ? T[K]['base']
        : never;
      implementation: T[K]['implementation'] extends UnboxedObjectSchema<SchemaValidator>
        ? T[K]['implementation'] extends T[K]['base']
          ? T[K]['implementation']
          : never
        : never;
    };
  }
>(
  schemas: T
): {
  [K in keyof T]: T[K]['implementation'];
} {
  return Object.fromEntries(
    Object.entries(schemas).map(([key, schema]) => [
      key,
      isDtoRegistration(schema)
        ? validateSchemas(schema.base)(schema.implementation)
        : schema
    ])
  ) as {
    [K in keyof T]: T[K]['implementation'];
  };
}

export const IdDtoSchema = {
  id: string
};

export const IdsDtoSchema = {
  ids: optional(array(string))
};

export const SchemaRegistry = schemaRegistrations({
  [BillingPortalServiceName]: {
    base: BaseBillingPortalServiceParameters,
    implementation: {
      CreateBillingPortalDto: CreateBillingPortalDtoMapper.schema(),
      UpdateBillingPortalDto: UpdateBillingPortalDtoMapper.schema(),
      BillingPortalDto: BillingPortalDtoMapper.schema(),
      IdDto: IdDtoSchema
    }
  },
  [CheckoutSessionServiceName]: {
    base: BaseCheckoutSessionServiceParameters,
    implementation: {
      CreateCheckoutSessionDto: CreateCheckoutSessionDtoMapper.schema(),
      CheckoutSessionDto: CheckoutSessionDtoMapper.schema(),
      IdDto: IdDtoSchema
    }
  },
  [PaymentLinkServiceName]: {
    base: BasePaymentLinkServiceParameters,
    implementation: {
      CreatePaymentLinkDto: CreatePaymentLinkDtoMapper.schema(),
      UpdatePaymentLinkDto: UpdatePaymentLinkDtoMapper.schema(),
      PaymentLinkDto: PaymentLinkDtoMapper.schema(),
      IdDto: IdDtoSchema,
      IdsDto: IdsDtoSchema
    }
  },
  [PlanServiceName]: {
    base: BasePlanServiceParameters,
    implementation: {
      CreatePlanDto: CreatePlanDtoMapper.schema(),
      UpdatePlanDto: UpdatePlanDtoMapper.schema(),
      PlanDto: PlanDtoMapper.schema(),
      IdDto: IdDtoSchema,
      IdsDto: IdsDtoSchema
    }
  },
  [SubscriptionServiceName]: {
    base: BaseSubscriptionServiceParameters,
    implementation: {
      CreateSubscriptionDto: CreateSubscriptionDtoMapper.schema(),
      UpdateSubscriptionDto: UpdateSubscriptionDtoMapper.schema(),
      SubscriptionDto: SubscriptionDtoMapper.schema(),
      IdDto: IdDtoSchema,
      IdsDto: IdsDtoSchema
    }
  }
});

//! defines the configuration schema for the application
export function createDepenencies({ orm }: { orm: MikroORM }) {
  const runtimeDependencies = new ConfigInjector(SchemaValidator(), {
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
    },
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
    [BillingPortalServiceName]: {
      lifetime: Lifetime.Scoped,
      type: BaseBillingPortalService,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseBillingPortalService(TtlCache, OpenTelemetryCollector)
    },
    [CheckoutSessionServiceName]: {
      lifetime: Lifetime.Scoped,
      type: BaseCheckoutSessionService,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BaseCheckoutSessionService(TtlCache, OpenTelemetryCollector)
    },
    [PaymentLinkServiceName]: {
      lifetime: Lifetime.Scoped,
      type: BasePaymentLinkService,
      factory: ({ TtlCache, OpenTelemetryCollector }) =>
        new BasePaymentLinkService(TtlCache, OpenTelemetryCollector)
    },
    [PlanServiceName]: {
      lifetime: Lifetime.Scoped,
      type: BasePlanService,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BasePlanService(EntityManager, OpenTelemetryCollector)
    },
    [SubscriptionServiceName]: {
      lifetime: Lifetime.Scoped,
      type: BaseSubscriptionService,
      factory: ({ EntityManager, OpenTelemetryCollector }) =>
        new BaseSubscriptionService(EntityManager, OpenTelemetryCollector)
    }
  });
  return {
    configInjector: runtimeDependencies,
    registeredSchemas: SchemaRegistry
  };
}

export type SchemaRegistration<T extends keyof typeof SchemaRegistry> = Schema<
  (typeof SchemaRegistry)[T],
  SchemaValidator
>;

export type ConfigShapes = ReturnType<
  typeof createDepenencies
>['configInjector']['configShapes'];
