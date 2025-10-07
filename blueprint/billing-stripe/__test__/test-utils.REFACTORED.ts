/**
 * REFACTORED VERSION using @forklaunch/testing
 *
 * This shows how the test-utils.ts would look after migrating to the framework package
 */

import {
  BillingProviderEnum,
  CurrencyEnum,
  PaymentMethodEnum,
  PlanCadenceEnum
} from '@forklaunch/implementation-billing-stripe/enum';
import {
  TestSetupResult as BaseTestSetupResult,
  BlueprintTestHarness,
  TEST_TOKENS
} from '@forklaunch/testing';
import { EntityManager } from '@mikro-orm/core';
import { vi } from 'vitest';
import { PartyEnum } from '../domain/enum/party.enum';
import { StatusEnum } from '../domain/enum/status.enum';

// Export standard tokens
export const MOCK_AUTH_TOKEN = TEST_TOKENS.AUTH;
export const MOCK_HMAC_TOKEN = TEST_TOKENS.HMAC;
export const MOCK_INVALID_HMAC_TOKEN = TEST_TOKENS.HMAC_INVALID;

// Extend TestSetupResult to match existing usage
export type TestSetupResult = BaseTestSetupResult;

// Create the test harness with Stripe-specific setup
const harness = new BlueprintTestHarness({
  mikroOrmConfigPath: '../mikro-orm.config',
  useMigrations: false, // Billing blueprints use schema generation
  needsRedis: true,
  customEnvVars: {
    STRIPE_API_KEY:
      'sk_test_51RZHBQP4Xs9lA9sq2hCQseYbRA4tKxMyRCViZQD3mofV8gIYqOjemsdaw7BEXGMKrWjSIAn2zZsGOUy2WT5If2W900LGUSgHq0',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890abcdefghijklmnopqrstuvwxyz'
  },
  onSetup: async (setup) => {
    // Stripe-specific setup: Create test customer, product, and price
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    // Create test customer with payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa'
      }
    });

    const customer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      payment_method: paymentMethod.id,
      invoice_settings: {
        default_payment_method: paymentMethod.id
      }
    });
    process.env.TEST_CUSTOMER_ID = customer.id;

    // Create test product
    const product = await stripe.products.create({
      name: 'Test Product',
      description: 'A test product for plans'
    });
    process.env.TEST_PRODUCT_ID = product.id;

    // Create test plan/price
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 1999,
      recurring: { interval: 'month' }
    });
    process.env.TEST_PLAN_ID = price.id;
  }
});

// Export harness methods
export const setupTestDatabase = () => harness.setup();
export const cleanupTestDatabase = () => harness.cleanup();
export const clearDatabase = () => harness.clearDatabase();

// ============================================================================
// Blueprint-specific mock data and helpers remain below
// ============================================================================

export const getMockSubscriptionData = () => ({
  partyId: process.env.TEST_CUSTOMER_ID!,
  partyType: PartyEnum.USER,
  description: 'New subscription',
  active: true,
  productId: process.env.TEST_PLAN_ID!,
  externalId: 'sub_new_123',
  billingProvider: BillingProviderEnum.STRIPE,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: 'active',
  stripeFields: {} as never
});

export const getMockUpdateSubscriptionData = () => ({
  id: '123e4567-e89b-12d3-a456-426614174003',
  partyId: process.env.TEST_CUSTOMER_ID!,
  partyType: 'user' as const,
  description: 'Updated subscription',
  active: false,
  productId: process.env.TEST_PLAN_ID!,
  externalId: 'sub_updated_123',
  billingProvider: 'stripe' as const,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: 'cancelled'
});

export const getMockPlanData = () => ({
  active: true,
  name: process.env.TEST_PRODUCT_ID!,
  description: 'A new test plan',
  price: 1999,
  currency: CurrencyEnum.USD,
  cadence: PlanCadenceEnum.MONTHLY,
  features: ['feature1', 'feature2'],
  externalId: 'plan_new_123',
  billingProvider: BillingProviderEnum.STRIPE,
  stripeFields: {} as never
});

export const getMockUpdatePlanData = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  active: false,
  name: 'Updated Plan',
  description: 'An updated test plan',
  price: 2999,
  currency: CurrencyEnum.USD,
  cadence: PlanCadenceEnum.YEARLY,
  features: ['updated_feature1', 'updated_feature2'],
  externalId: 'plan_updated_123',
  billingProvider: BillingProviderEnum.STRIPE
});

export const mockPlanData = getMockPlanData();
export const mockUpdatePlanData = getMockUpdatePlanData();
export const mockSubscriptionData = getMockSubscriptionData();
export const mockUpdateSubscriptionData = getMockUpdateSubscriptionData();

export const getMockCheckoutSessionData = () => ({
  paymentMethods: [PaymentMethodEnum.CARD],
  currency: CurrencyEnum.USD,
  status: StatusEnum.PENDING,
  successRedirectUri: 'https://example.com/success',
  cancelRedirectUri: 'https://example.com/cancel',
  billingProvider: BillingProviderEnum.STRIPE,
  externalId: 'cs_new_123',
  stripeFields: {
    line_items: [
      {
        price: process.env.TEST_PLAN_ID!,
        quantity: 1
      }
    ]
  }
});

export const mockCheckoutSessionData = getMockCheckoutSessionData();

export const getMockPaymentLinkData = () => ({
  paymentMethods: [PaymentMethodEnum.CARD],
  currency: CurrencyEnum.USD,
  status: StatusEnum.PENDING,
  amount: 9999,
  description: 'Test Payment Link',
  stripeFields: {
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Test Product',
            description: 'Test Payment Link'
          },
          unit_amount: 9999
        },
        quantity: 1
      }
    ]
  }
});

export const mockPaymentLinkData = getMockPaymentLinkData();

export const getMockUpdatePaymentLinkData = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  paymentMethods: [PaymentMethodEnum.CARD],
  currency: CurrencyEnum.EUR,
  status: StatusEnum.COMPLETED,
  amount: 14999,
  description: 'Updated Payment Link'
});

export const mockUpdatePaymentLinkData = getMockUpdatePaymentLinkData();

export const getMockBillingPortalData = () => ({
  customerId: process.env.TEST_CUSTOMER_ID!,
  externalId: 'portal_new_123',
  billingProvider: BillingProviderEnum.STRIPE,
  returnUrl: 'https://example.com/return',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  stripeFields: {} as never
});

export const mockBillingPortalData = getMockBillingPortalData();

export const getMockUpdateBillingPortalData = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  customerId: 'cus_updated_123',
  externalId: 'portal_updated_123',
  billingProvider: 'STRIPE'
});

export const mockUpdateBillingPortalData = getMockUpdateBillingPortalData();

/**
 * Setup test data in the database (if needed for specific tests)
 * Most tests no longer need this since we removed beforeEach hooks
 */
export const setupTestData = async (em: EntityManager) => {
  vi.clearAllMocks();

  // Note: Plan and Subscription entities are commented out since they're managed by Stripe
  // Uncomment if specific tests need database entries

  // const { Plan } = await import('../persistence/entities/plan.entity');
  // const { Subscription } = await import('../persistence/entities/subscription.entity');
  // em.create(Plan, {...});
  // em.create(Subscription, {...});

  await em.flush();
};
