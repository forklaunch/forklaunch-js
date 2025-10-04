import { EntityManager, MikroORM } from '@mikro-orm/core';
import Redis from 'ioredis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { vi } from 'vitest';

export const MOCK_AUTH_TOKEN = 'Bearer test-token';
export const MOCK_HMAC_TOKEN =
  'HMAC keyId=test-key ts=1234567890 nonce=test-nonce signature=test-signature';
export const MOCK_INVALID_HMAC_TOKEN =
  'HMAC keyId=invalid-key ts=1234567890 nonce=invalid-nonce signature=invalid-signature';

export interface TestSetupResult {
  container: StartedTestContainer;
  redisContainer: StartedTestContainer;
  orm: MikroORM;
  redis: Redis;
}

export const setupTestDatabase = async (): Promise<TestSetupResult> => {
  const container = await new GenericContainer('postgres:latest')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: 'test_user',
      POSTGRES_PASSWORD: 'test_password',
      POSTGRES_DB: 'test_db'
    })
    .withCommand(['postgres', '-c', 'log_statement=all'])
    .start();

  const redisContainer = await new GenericContainer('redis:latest')
    .withExposedPorts(6379)
    .withCommand(['redis-server', '--appendonly', 'yes'])
    .start();

  process.env.DB_NAME = 'test_db';
  process.env.DB_HOST = container.getHost();
  process.env.DB_USER = 'test_user';
  process.env.DB_PASSWORD = 'test_password';
  process.env.DB_PORT = container.getMappedPort(5432).toString();
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
  process.env.HMAC_SECRET_KEY = 'test-secret-key';
  process.env.JWKS_PUBLIC_KEY_URL =
    'http://localhost:3000/.well-known/jwks.json';
  process.env.OTEL_SERVICE_NAME = 'test-service';
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
  process.env.HOST = 'localhost';
  process.env.PORT = '3000';
  process.env.NODE_ENV = 'test';
  process.env.VERSION = 'v1';
  process.env.DOCS_PATH = '/docs';
  process.env.OTEL_LEVEL = 'info';
  process.env.DOTENV_FILE_PATH = '.env.test';

  const { default: mikroOrmConfig } = await import('../mikro-orm.config');

  const config = {
    ...mikroOrmConfig,
    dbName: 'test_db',
    host: container.getHost(),
    user: 'test_user',
    password: 'test_password',
    port: container.getMappedPort(5432),
    debug: false,
    schemaGenerator: {
      createForeignKeyConstraints: false,
      wrap: false
    }
  };

  const orm = await MikroORM.init(config);
  await orm.getSchemaGenerator().createSchema();

  const redis = new Redis({
    host: redisContainer.getHost(),
    port: redisContainer.getMappedPort(6379),
    maxRetriesPerRequest: 3
  });

  await redis.ping();

  return { container, redisContainer, orm, redis };
};

export const cleanupTestDatabase = async (
  orm: MikroORM,
  container: StartedTestContainer,
  redisContainer: StartedTestContainer,
  redis: Redis
): Promise<void> => {
  if (redis) {
    await redis.quit();
  }
  if (orm) {
    await orm.close();
  }
  if (redisContainer) {
    await redisContainer.stop({ remove: true, removeVolumes: true });
  }
  if (container) {
    await container.stop({ remove: true, removeVolumes: true });
  }
};

export const clearDatabase = async (
  orm: MikroORM,
  redis?: Redis
): Promise<void> => {
  vi.clearAllMocks();

  if (redis) {
    await redis.flushall();
  }

  const em = orm.em.fork();
  const entities = Object.values(orm.getMetadata().getAll());

  for (const entity of entities.reverse()) {
    try {
      await em.nativeDelete(entity.class, {});
    } catch (error) {
      if (!(error as Error).message?.includes('does not exist')) {
        throw error;
      }
    }
  }

  await em.flush();
};

export const setupTestData = async (em: EntityManager) => {
  const { Plan } = await import('../persistence/entities/plan.entity');
  const { Subscription } = await import(
    '../persistence/entities/subscription.entity'
  );
  const { CheckoutSession } = await import(
    '../persistence/entities/checkoutSession.entity'
  );
  const { PaymentLink } = await import(
    '../persistence/entities/paymentLink.entity'
  );
  const { BillingPortal } = await import(
    '../persistence/entities/billingPortal.entity'
  );
  const { BillingProvider } = await import(
    '../persistence/entities/billingProvider.entity'
  );
  const { BillingProviderEnum } = await import(
    '../domain/enum/billingProvider.enum'
  );
  const { CurrencyEnum } = await import('../domain/enum/currency.enum');
  const { PlanCadenceEnum } = await import('../domain/enum/planCadence.enum');
  const { PartyEnum } = await import('../domain/enum/party.enum');
  const { StatusEnum } = await import('../domain/enum/status.enum');
  const { PaymentMethodEnum } = await import(
    '../domain/enum/paymentMethod.enum'
  );

  em.create(BillingProvider, {
    id: '123e4567-e89b-12d3-a456-426614174001',
    billingProvider: BillingProviderEnum.STRIPE,
    providerFields: { apiKey: 'test-api-key' },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  em.create(Plan, {
    id: '123e4567-e89b-12d3-a456-426614174002',
    active: true,
    name: 'Test Plan',
    description: 'A test plan',
    price: 2999,
    currency: CurrencyEnum.USD,
    cadence: PlanCadenceEnum.MONTHLY,
    features: ['feature1', 'feature2'],
    externalId: 'plan_test_123',
    billingProvider: BillingProviderEnum.STRIPE,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  em.create(Subscription, {
    id: '123e4567-e89b-12d3-a456-426614174003',
    partyId: '123e4567-e89b-12d3-a456-426614174000',
    partyType: PartyEnum.USER,
    description: 'Test subscription',
    active: true,
    productId: '123e4567-e89b-12d3-a456-426614174002',
    externalId: 'sub_test_123',
    billingProvider: BillingProviderEnum.STRIPE,
    startDate: new Date(),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  em.create(CheckoutSession, {
    id: '123e4567-e89b-12d3-a456-426614174004',
    customerId: 'cus_test_123',
    paymentMethods: [PaymentMethodEnum.CREDIT_CARD],
    currency: CurrencyEnum.USD,
    uri: 'https://checkout.stripe.com/c/pay/test_123',
    successRedirectUri: 'https://example.com/success',
    cancelRedirectUri: 'https://example.com/cancel',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: StatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  em.create(PaymentLink, {
    id: '123e4567-e89b-12d3-a456-426614174005',
    amount: 4999,
    paymentMethods: [PaymentMethodEnum.CREDIT_CARD],
    currency: CurrencyEnum.USD,
    description: 'A test payment link',
    status: StatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  em.create(BillingPortal, {
    id: '123e4567-e89b-12d3-a456-426614174006',
    customerId: 'cus_test_123',
    uri: 'https://example.com/billing',
    providerFields: { apiKey: 'test-api-key' },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await em.flush();
};

export const mockPlanData = {
  active: true,
  name: 'New Plan',
  description: 'A new test plan',
  price: 1999,
  currency: 'USD' as const,
  cadence: 'MONTHLY' as const,
  features: ['feature1', 'feature2'],
  externalId: 'plan_new_123',
  billingProvider: 'stripe' as const
};

export const mockUpdatePlanData = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  active: false,
  name: 'Updated Plan',
  description: 'An updated test plan',
  price: 3999,
  currency: 'USD' as const,
  cadence: 'ANNUALLY' as const,
  features: ['feature1', 'feature2', 'feature3'],
  externalId: 'plan_updated_123',
  billingProvider: 'stripe' as const
};

export const mockSubscriptionData = {
  partyId: '123e4567-e89b-12d3-a456-426614174000',
  partyType: 'user' as const,
  description: 'New subscription',
  active: true,
  productId: '123e4567-e89b-12d3-a456-426614174002',
  externalId: 'sub_new_123',
  billingProvider: 'stripe' as const,
  startDate: new Date(),
  status: 'active'
};

export const mockUpdateSubscriptionData = {
  id: '123e4567-e89b-12d3-a456-426614174003',
  partyId: '123e4567-e89b-12d3-a456-426614174000',
  partyType: 'user' as const,
  description: 'Updated subscription',
  active: false,
  productId: '123e4567-e89b-12d3-a456-426614174002',
  externalId: 'sub_updated_123',
  billingProvider: 'stripe' as const,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: 'cancelled'
};

export const mockCheckoutSessionData = {
  customerId: 'cus_new_123',
  paymentMethods: ['credit_card' as const, 'ach' as const],
  currency: 'EUR' as const,
  uri: 'https://checkout.stripe.com/c/pay/new_123',
  successRedirectUri: 'https://example.com/new-success',
  cancelRedirectUri: 'https://example.com/new-cancel',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  status: 'PENDING' as const
};

export const mockPaymentLinkData = {
  paymentMethods: ['credit_card' as const, 'paypal' as const],
  currency: 'GBP' as const,
  status: 'PENDING' as const,
  amount: 9999,
  price: 9999,
  description: 'Test Payment Link'
};

export const mockBillingPortalData = {
  id: '123e4567-e89b-12d3-a456-426614174006',
  customerId: 'cus_new_123',
  returnUrl: 'https://example.com/billing',
  billingProvider: 'stripe' as const,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
};

export const mockPlanResponse = [
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    active: true,
    name: 'Test Plan',
    description: 'A test plan',
    price: 2999,
    currency: 'USD',
    cadence: 'MONTHLY',
    features: ['feature1', 'feature2'],
    externalId: 'plan_test_123',
    billingProvider: 'STRIPE',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  }
];

export const mockSubscriptionResponse = [
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    partyId: '123e4567-e89b-12d3-a456-426614174000',
    partyType: 'USER',
    description: 'Test subscription',
    active: true,
    productId: '123e4567-e89b-12d3-a456-426614174002',
    externalId: 'sub_test_123',
    billingProvider: 'STRIPE',
    startDate: expect.any(Date),
    status: 'active',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  }
];

export const mockCheckoutSessionResponse = [
  {
    id: '123e4567-e89b-12d3-a456-426614174004',
    customerId: 'cus_test_123',
    paymentMethods: ['CARD'],
    currency: 'USD',
    uri: 'https://checkout.stripe.com/c/pay/test_123',
    successRedirectUri: 'https://example.com/success',
    cancelRedirectUri: 'https://example.com/cancel',
    expiresAt: expect.any(Date),
    status: 'PENDING',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  }
];

export const mockPaymentLinkResponse = [
  {
    id: '123e4567-e89b-12d3-a456-426614174005',
    name: 'Test Payment Link',
    description: 'A test payment link',
    price: 4999,
    currency: 'USD',
    active: true,
    externalId: 'plink_test_123',
    billingProvider: 'STRIPE',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  }
];

export const mockBillingPortalResponse = {
  id: '123e4567-e89b-12d3-a456-426614174006',
  customerId: 'cus_test_123',
  returnUrl: 'https://example.com/billing',
  externalId: 'portal_test_123',
  billingProvider: 'STRIPE',
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date)
};
