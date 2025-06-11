import { EntityManager } from '@mikro-orm/core';
import { BillingProviderEnum } from '../domain/enum/billingProvider.enum';
import { CurrencyEnum } from '../domain/enum/currency.enum';
import { PartyEnum } from '../domain/enum/party.enum';
import { PaymentMethodEnum } from '../domain/enum/paymentMethod.enum';
import { PlanCadenceEnum } from '../domain/enum/planCadence.enum';
import { StatusEnum } from '../domain/enum/status.enum';
import { BillingProvider } from './entities/billingProvider.entity';
import { CheckoutSession } from './entities/checkoutSession.entity';
import { PaymentLink } from './entities/paymentLink.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';

//! Begin seed data
export const billingProvider = async (em: EntityManager) =>
  em.create(BillingProvider, {
    billingProvider: BillingProviderEnum.STRIPE,
    externalId: '1234567890',
    extraFields: {},
    createdAt: new Date(),
    updatedAt: new Date()
  });
export const paymentLink = async (em: EntityManager) =>
  PaymentLink.create(
    {
      amount: 1000,
      currency: CurrencyEnum.USD,
      description: 'Test payment link',
      successRedirectUri: 'https://example.com/success',
      cancelRedirectUri: 'https://example.com/cancel',
      expiresAt: new Date(),
      status: StatusEnum.EXPIRED,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
export const plan = async (em: EntityManager) =>
  Plan.create(
    {
      active: true,
      name: 'Basic',
      description: 'Basic plan',
      price: 1000,
      cadence: PlanCadenceEnum.MONTHLY,
      features: ['feature1', 'feature2'],
      extraFields: {},
      externalId: '1234567890',
      billingProvider: BillingProviderEnum.STRIPE,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
export const checkoutSession = async (em: EntityManager) =>
  CheckoutSession.create(
    {
      customerId: 'test@example.com',
      paymentMethods: [PaymentMethodEnum.CREDIT_CARD],
      metadata: {},
      successRedirectUri: 'https://example.com/success',
      cancelRedirectUri: 'https://example.com/cancel',
      expiresAt: new Date(),
      status: StatusEnum.EXPIRED,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );

export const subscription = async (em: EntityManager) =>
  Subscription.create(
    {
      partyId: '1234567890',
      partyType: PartyEnum.USER,
      description: 'Test subscription',
      active: true,
      productId: '1234567890',
      extraFields: {},
      externalId: '1234567890',
      billingProvider: BillingProviderEnum.STRIPE,
      startDate: new Date(),
      endDate: new Date(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
