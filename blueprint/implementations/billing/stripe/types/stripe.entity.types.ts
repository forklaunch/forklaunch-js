import {
  BillingPortalDto,
  CheckoutSessionDto,
  PaymentLinkDto,
  PlanDto,
  SubscriptionDto
} from '@forklaunch/interfaces-billing/types';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enums/billingProvider.enum';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import { PlanCadenceEnum } from '../domain/enums/planCadence.enum';

// Billing Portal Types
export type StripeBillingPortalEntity = BillingPortalDto & {
  providerFields: Stripe.BillingPortal.Session;
};

export type StripeBillingPortalEntities = {
  BillingPortalMapper: StripeBillingPortalEntity;
  CreateBillingPortalMapper: StripeBillingPortalEntity;
  UpdateBillingPortalMapper: StripeBillingPortalEntity;
};

// Checkout Session Types

export type StripeCheckoutSessionEntity<StatusEnum> = CheckoutSessionDto<
  typeof PaymentMethodEnum,
  typeof CurrencyEnum,
  StatusEnum
> & {
  providerFields: Stripe.Checkout.Session;
};

export type StripeCheckoutSessionEntities<StatusEnum> = {
  CheckoutSessionMapper: StripeCheckoutSessionEntity<StatusEnum>;
  CreateCheckoutSessionMapper: StripeCheckoutSessionEntity<StatusEnum>;
  UpdateCheckoutSessionMapper: StripeCheckoutSessionEntity<StatusEnum>;
};

// Payment Link Types
export type StripePaymentLinkEntity<StatusEnum> = PaymentLinkDto<
  typeof PaymentMethodEnum,
  typeof CurrencyEnum,
  StatusEnum
> & {
  providerFields: Stripe.PaymentLink;
};

export type StripePaymentLinkEntities<StatusEnum> = {
  PaymentLinkMapper: StripePaymentLinkEntity<StatusEnum>;
  CreatePaymentLinkMapper: StripePaymentLinkEntity<StatusEnum>;
  UpdatePaymentLinkMapper: StripePaymentLinkEntity<StatusEnum>;
};

// Plan Types
export type StripePlanEntity = PlanDto<
  typeof PlanCadenceEnum,
  typeof CurrencyEnum,
  typeof BillingProviderEnum
> & {
  providerFields: Stripe.Plan;
};

export type StripePlanEntities = {
  PlanMapper: StripePlanEntity;
  CreatePlanMapper: StripePlanEntity;
  UpdatePlanMapper: StripePlanEntity;
};

// Subscription Types
export type StripeSubscriptionEntity<PartyType> = SubscriptionDto<
  PartyType,
  typeof BillingProviderEnum
> & {
  providerFields: Stripe.Subscription;
};

export type StripeSubscriptionEntities<PartyType> = {
  SubscriptionMapper: StripeSubscriptionEntity<PartyType>;
  CreateSubscriptionMapper: StripeSubscriptionEntity<PartyType>;
  UpdateSubscriptionMapper: StripeSubscriptionEntity<PartyType>;
};
