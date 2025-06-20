import {
  BillingPortalDto,
  CheckoutSessionDto,
  CreateBillingPortalDto,
  CreateCheckoutSessionDto,
  CreatePaymentLinkDto,
  CreatePlanDto,
  CreateSubscriptionDto,
  PaymentLinkDto,
  PlanDto,
  SubscriptionDto,
  UpdateBillingPortalDto,
  UpdateCheckoutSessionDto,
  UpdatePaymentLinkDto,
  UpdatePlanDto,
  UpdateSubscriptionDto
} from '@forklaunch/interfaces-billing/types';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enums/billingProvider.enum';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import { PlanCadenceEnum } from '../domain/enums/planCadence.enum';

// Billing Portal Types
type BillingPortalOmissions = 'customer';

export type StripeCreateBillingPortalDto = Omit<
  CreateBillingPortalDto,
  'providerFields'
> & {
  stripeFields: Omit<
    Stripe.BillingPortal.SessionCreateParams,
    BillingPortalOmissions
  >;
};

export type StripeUpdateBillingPortalDto = Omit<
  UpdateBillingPortalDto,
  'providerFields'
> & {
  stripeFields?: Omit<
    Stripe.BillingPortal.SessionCreateParams,
    BillingPortalOmissions
  >;
};

export type StripeBillingPortalDto = Omit<
  BillingPortalDto,
  'providerFields'
> & {
  stripeFields: Stripe.BillingPortal.Session;
};

export type StripeBillingPortalDtos = {
  BillingPortalMapper: StripeBillingPortalDto;
  CreateBillingPortalMapper: StripeCreateBillingPortalDto;
  UpdateBillingPortalMapper: StripeUpdateBillingPortalDto;
};

// Checkout Session Types
type CheckoutSessionOmissions =
  | 'payment_method_types'
  | 'currency'
  | 'success_url'
  | 'cancel_url';

export type StripeCreateCheckoutSessionDto<StatusEnum> = Omit<
  CreateCheckoutSessionDto<
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum
  >,
  'providerFields'
> & {
  stripeFields: Omit<
    Stripe.Checkout.SessionCreateParams,
    CheckoutSessionOmissions
  >;
};

export type StripeUpdateCheckoutSessionDto<StatusEnum> = Omit<
  UpdateCheckoutSessionDto<
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum
  >,
  'providerFields'
> & {
  stripeFields?: Omit<
    Stripe.Checkout.SessionCreateParams,
    CheckoutSessionOmissions
  >;
};

export type StripeCheckoutSessionDto<StatusEnum> = Omit<
  CheckoutSessionDto<typeof PaymentMethodEnum, typeof CurrencyEnum, StatusEnum>,
  'providerFields'
> & {
  stripeFields: Stripe.Checkout.Session;
};

export type StripeCheckoutSessionDtos<StatusEnum> = {
  CheckoutSessionMapper: StripeCheckoutSessionDto<StatusEnum>;
  CreateCheckoutSessionMapper: StripeCreateCheckoutSessionDto<StatusEnum>;
  UpdateCheckoutSessionMapper: StripeUpdateCheckoutSessionDto<StatusEnum>;
};

// Payment Link Types
export type StripeCreatePaymentLinkDto<StatusEnum> = Omit<
  CreatePaymentLinkDto<
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum
  >,
  'providerFields'
> & {
  stripeFields: Stripe.PaymentLinkCreateParams;
};

export type StripeUpdatePaymentLinkDto<StatusEnum> = Omit<
  UpdatePaymentLinkDto<
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum
  >,
  'providerFields'
> & {
  stripeFields?: Stripe.PaymentLinkUpdateParams;
};

export type StripePaymentLinkDto<StatusEnum> = Omit<
  PaymentLinkDto<typeof PaymentMethodEnum, typeof CurrencyEnum, StatusEnum>,
  'providerFields'
> & {
  stripeFields: Stripe.PaymentLink;
};

export type StripePaymentLinkDtos<StatusEnum> = {
  PaymentLinkMapper: StripePaymentLinkDto<StatusEnum>;
  CreatePaymentLinkMapper: StripeCreatePaymentLinkDto<StatusEnum>;
  UpdatePaymentLinkMapper: StripeUpdatePaymentLinkDto<StatusEnum>;
};

// Plan Types
type PlanOmissions = 'product' | 'interval' | 'currency';

export type StripeCreatePlanDto = Omit<
  CreatePlanDto<
    typeof PlanCadenceEnum,
    typeof CurrencyEnum,
    typeof BillingProviderEnum
  >,
  'providerFields'
> & {
  stripeFields: Omit<Stripe.PlanCreateParams, PlanOmissions>;
};

export type StripeUpdatePlanDto = Omit<
  UpdatePlanDto<
    typeof PlanCadenceEnum,
    typeof CurrencyEnum,
    typeof BillingProviderEnum
  >,
  'providerFields'
> & {
  stripeFields?: Omit<Stripe.PlanUpdateParams, PlanOmissions>;
};

export type StripePlanDto = Omit<
  PlanDto<
    typeof PlanCadenceEnum,
    typeof CurrencyEnum,
    typeof BillingProviderEnum
  >,
  'providerFields'
> & {
  stripeFields: Stripe.Plan;
};

export type StripePlanDtos = {
  PlanMapper: StripePlanDto;
  CreatePlanMapper: StripeCreatePlanDto;
  UpdatePlanMapper: StripeUpdatePlanDto;
};

// Subscription Types
type SubscriptionOmissions = 'items' | 'customer';

export type StripeCreateSubscriptionDto<PartyType> = Omit<
  CreateSubscriptionDto<PartyType, typeof BillingProviderEnum>,
  'providerFields'
> & {
  stripeFields: Omit<Stripe.SubscriptionCreateParams, SubscriptionOmissions>;
};

export type StripeUpdateSubscriptionDto<PartyType> = Omit<
  UpdateSubscriptionDto<PartyType, typeof BillingProviderEnum>,
  'providerFields'
> & {
  stripeFields?: Omit<Stripe.SubscriptionUpdateParams, SubscriptionOmissions>;
};

export type StripeSubscriptionDto<PartyType> = Omit<
  SubscriptionDto<PartyType, typeof BillingProviderEnum>,
  'providerFields'
> & {
  stripeFields: Stripe.Subscription;
};

export type StripeSubscriptionDtos<PartyType> = {
  SubscriptionMapper: StripeSubscriptionDto<PartyType>;
  CreateSubscriptionMapper: StripeCreateSubscriptionDto<PartyType>;
  UpdateSubscriptionMapper: StripeUpdateSubscriptionDto<PartyType>;
};
