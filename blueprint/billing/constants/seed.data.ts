import { BillingProviderEnum } from '../models/enum/billingProvider.enum';
import { CurrencyEnum } from '../models/enum/currency.enum';
import { PartyEnum } from '../models/enum/party.enum';
import { PaymentMethodEnum } from '../models/enum/paymentMethod.enum';
import { PlanCadenceEnum } from '../models/enum/planCadence.enum';
import { BillingProvider } from '../models/persistence/billingProvider.entity';
import { CheckoutSession } from '../models/persistence/checkoutSession';
import { PaymentLink } from '../models/persistence/paymentLink.entity';
import { Plan } from '../models/persistence/plan.entity';
import { Subscription } from '../models/persistence/subscription.entity';
//! Begin seed data
export const billingProvider = BillingProvider.create({
  billingProvider: BillingProviderEnum.STRIPE,
  externalId: '1234567890',
  extraFields: {}
});
export const paymentLink = PaymentLink.create({
  amount: 1000,
  currency: CurrencyEnum.USD,
  description: 'Test payment link',
  successRedirectUri: 'https://example.com/success',
  cancelRedirectUri: 'https://example.com/cancel'
});
export const plan = Plan.create({
  active: true,
  type: 'subscription',
  name: 'Basic',
  description: 'Basic plan',
  price: 1000,
  cadence: PlanCadenceEnum.MONTHLY,
  features: ['feature1', 'feature2'],
  extraFields: {},
  externalId: '1234567890',
  billingProvider: BillingProviderEnum.STRIPE
});
export const checkoutSession = CheckoutSession.create({
  customerId: 'test@example.com',
  paymentMethods: [PaymentMethodEnum.CREDIT_CARD],
  metadata: {},
  successRedirectUri: 'https://example.com/success',
  cancelRedirectUri: 'https://example.com/cancel',
  extraFields: {}
});

export const subscription = Subscription.create({
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
  status: 'active'
});
