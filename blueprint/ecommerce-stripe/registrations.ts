import {
  number,
  optional,
  schemaValidator,
  SchemaValidator,
  string
} from './schema';
import { Metrics, metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { wrapEmWithTenantContext } from '@forklaunch/core/persistence';
import {
  createConfigInjector,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import {
  BaseCartService,
  BaseInventoryService,
  BaseOrderService,
  BaseProductService,
  BaseSubscriptionService,
  BaseVariantService
} from '@forklaunch/implementation-ecommerce-base/services';
import { StripePaymentService } from '@forklaunch/implementation-ecommerce-stripe/services';
import { ForkOptions } from '@mikro-orm/core';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import Stripe from 'stripe';
import {
  CartMapper,
  CreateCartMapper,
  UpdateCartMapper
} from './domain/mappers/cart.mappers';
import {
  CreateInventoryMapper,
  InventoryMapper,
  UpdateInventoryMapper
} from './domain/mappers/inventory.mappers';
import {
  CreateOrderMapper,
  OrderMapper,
  UpdateOrderMapper
} from './domain/mappers/order.mappers';
import {
  CreatePaymentMapper,
  PaymentMapper
} from './domain/mappers/payment.mappers';
import {
  CreateProductMapper,
  ProductMapper,
  UpdateProductMapper
} from './domain/mappers/product.mappers';
import {
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from './domain/mappers/subscription.mappers';
import {
  CreateVariantMapper,
  UpdateVariantMapper,
  VariantMapper
} from './domain/mappers/variant.mappers';
import {
  CartDtoTypes,
  CartMapperTypes,
  InventoryDtoTypes,
  InventoryMapperTypes,
  OrderDtoTypes,
  OrderMapperTypes,
  PaymentDtoTypes,
  PaymentMapperTypes,
  ProductDtoTypes,
  ProductMapperTypes,
  SubscriptionDtoTypes,
  SubscriptionMapperTypes,
  VariantDtoTypes,
  VariantMapperTypes
} from './domain/types/ecommerceMappers.types';
import mikroOrmOptionsConfig from './mikro-orm.config';

//! defines the configuration schema for the application
const configInjector = createConfigInjector(schemaValidator, {
  SERVICE_METADATA: {
    lifetime: Lifetime.Singleton,
    type: {
      name: string,
      version: string
    },
    value: {
      name: 'ecommerce',
      version: '0.1.0'
    }
  }
});

//! defines the environment configuration for the application
const environmentConfig = configInjector.chain({
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
  },
  STRIPE_WEBHOOK_SECRET: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('STRIPE_WEBHOOK_SECRET')
  },
  HMAC_SECRET_KEY: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('HMAC_SECRET_KEY')
  },
  JWKS_PUBLIC_KEY_URL: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('JWKS_PUBLIC_KEY_URL')
  },
  ENCRYPTION_KEY: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('ENCRYPTION_KEY')
  }
});

//! defines the runtime dependencies for the application
const runtimeDependencies = environmentConfig.chain({
  StripeClient: {
    lifetime: Lifetime.Singleton,
    type: Stripe,
    factory: ({ STRIPE_API_KEY }) => new Stripe(STRIPE_API_KEY)
  },
  Orm: {
    lifetime: Lifetime.Singleton,
    type: MikroORM,
    factory: () => new MikroORM(mikroOrmOptionsConfig)
  },
  OtelCollector: {
    lifetime: Lifetime.Singleton,
    type: OpenTelemetryCollector<Metrics>,
    factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
      new OpenTelemetryCollector(
        OTEL_SERVICE_NAME,
        OTEL_LEVEL || 'info',
        metrics
      )
  },
  EntityManager: {
    lifetime: Lifetime.Scoped,
    type: EntityManager,
    factory: (
      { Orm },
      context: { entityManagerOptions?: ForkOptions; tenantId?: string }
    ) =>
      wrapEmWithTenantContext(
        Orm.em.fork(context?.entityManagerOptions),
        context?.tenantId
      ) as EntityManager
  }
});

//! defines the service dependencies for the application
const serviceDependencies = runtimeDependencies.chain({
  ProductService: {
    lifetime: Lifetime.Scoped,
    type: BaseProductService<SchemaValidator, ProductMapperTypes, ProductDtoTypes>,
    factory: ({ EntityManager, OtelCollector }, context, resolve) =>
      new BaseProductService(
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        { ProductMapper, CreateProductMapper, UpdateProductMapper }
      )
  },
  VariantService: {
    lifetime: Lifetime.Scoped,
    type: BaseVariantService<SchemaValidator, VariantMapperTypes, VariantDtoTypes>,
    factory: ({ EntityManager, OtelCollector }, context, resolve) =>
      new BaseVariantService(
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        { VariantMapper, CreateVariantMapper, UpdateVariantMapper }
      )
  },
  InventoryService: {
    lifetime: Lifetime.Scoped,
    type: BaseInventoryService<
      SchemaValidator,
      InventoryMapperTypes,
      InventoryDtoTypes
    >,
    factory: ({ EntityManager, OtelCollector }, context, resolve) =>
      new BaseInventoryService(
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        { InventoryMapper, CreateInventoryMapper, UpdateInventoryMapper }
      )
  },
  CartService: {
    lifetime: Lifetime.Scoped,
    type: BaseCartService<SchemaValidator, CartMapperTypes, CartDtoTypes>,
    factory: ({ EntityManager, OtelCollector }, context, resolve) =>
      new BaseCartService(
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        { CartMapper, CreateCartMapper, UpdateCartMapper }
      )
  },
  OrderService: {
    lifetime: Lifetime.Scoped,
    type: BaseOrderService<SchemaValidator, OrderMapperTypes, OrderDtoTypes>,
    factory: ({ EntityManager, OtelCollector }, context, resolve) =>
      new BaseOrderService(
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        { OrderMapper, CreateOrderMapper, UpdateOrderMapper }
      )
  },
  SubscriptionService: {
    lifetime: Lifetime.Scoped,
    type: BaseSubscriptionService<
      SchemaValidator,
      SubscriptionMapperTypes,
      SubscriptionDtoTypes
    >,
    factory: ({ EntityManager, OtelCollector }, context, resolve) =>
      new BaseSubscriptionService(
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        {
          SubscriptionMapper,
          CreateSubscriptionMapper,
          UpdateSubscriptionMapper
        }
      )
  },
  PaymentService: {
    lifetime: Lifetime.Scoped,
    type: StripePaymentService<
      SchemaValidator,
      PaymentMapperTypes,
      PaymentDtoTypes
    >,
    factory: (
      { StripeClient, EntityManager, OtelCollector },
      context,
      resolve
    ) =>
      new StripePaymentService(
        StripeClient,
        context.entityManagerOptions
          ? resolve('EntityManager', context)
          : EntityManager,
        OtelCollector,
        schemaValidator,
        { PaymentMapper, CreatePaymentMapper }
      )
  }
});

//! validates the configuration and returns the dependencies for the application
export const createDependencyContainer = (envFilePath: string) => {
  const ci = serviceDependencies.validateConfigSingletons(envFilePath);
  const tokens = serviceDependencies.tokens();
  return {
    ci,
    tokens
  };
};
