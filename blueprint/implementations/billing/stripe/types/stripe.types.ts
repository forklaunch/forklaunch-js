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
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import { PlanCadenceEnum } from '../domain/enums/planCadence.enum';

// Billing Portal Types
type BillingPortalOmissions = 'customer';

export type StripeCreateBillingPortalDto = CreateBillingPortalDto & {
  extraFields?: Omit<
    Stripe.BillingPortal.SessionCreateParams,
    BillingPortalOmissions
  >;
};

export type StripeUpdateBillingPortalDto = UpdateBillingPortalDto & {
  extraFields?: Omit<
    Stripe.BillingPortal.SessionCreateParams,
    BillingPortalOmissions
  >;
};

export type StripeBillingPortalDto = BillingPortalDto & {
  extraFields?: Omit<Stripe.BillingPortal.Session, BillingPortalOmissions>;
};

// Checkout Session Types
type CheckoutSessionOmissions =
  | 'mode'
  | 'payment_method_types'
  | 'line_items'
  | 'currency'
  | 'success_url'
  | 'cancel_url';

export type StripeCreateCheckoutSessionDto<StatusEnum> =
  CreateCheckoutSessionDto<
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum
  > & {
    mode: Stripe.Checkout.SessionCreateParams.Mode;
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    extraFields?: Omit<
      Stripe.Checkout.SessionCreateParams,
      CheckoutSessionOmissions
    >;
  };

export type StripeUpdateCheckoutSessionDto<StatusEnum> =
  UpdateCheckoutSessionDto<
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum
  > & {
    extraFields?: Omit<
      Stripe.Checkout.SessionCreateParams,
      CheckoutSessionOmissions
    >;
  };

export type StripeCheckoutSessionDto<StatusEnum> = CheckoutSessionDto<
  typeof PaymentMethodEnum,
  typeof CurrencyEnum,
  StatusEnum
> & {
  mode: Stripe.Checkout.Session.Mode;
  lineItems: Stripe.LineItem[];
  extraFields?: Omit<Stripe.Checkout.Session, 'mode' | 'line_items'>;
};

// Payment Link Types
type PaymentLinkOmissions = 'line_items';

export type StripeCreatePaymentLinkDto<StatusEnum> = CreatePaymentLinkDto<
  typeof PaymentMethodEnum,
  typeof CurrencyEnum,
  StatusEnum
> & {
  lineItems: Stripe.PaymentLinkCreateParams.LineItem[];
  extraFields?: Omit<Stripe.PaymentLinkCreateParams, PaymentLinkOmissions>;
};

export type StripeUpdatePaymentLinkDto<StatusEnum> = UpdatePaymentLinkDto<
  typeof PaymentMethodEnum,
  typeof CurrencyEnum,
  StatusEnum
> & {
  lineItems?: Stripe.PaymentLinkUpdateParams.LineItem[];
  extraFields?: Omit<Stripe.PaymentLinkUpdateParams, PaymentLinkOmissions>;
};

export type StripePaymentLinkDto<StatusEnum> = PaymentLinkDto<
  typeof PaymentMethodEnum,
  typeof CurrencyEnum,
  StatusEnum
> & {
  lineItems: Stripe.LineItem[];
  extraFields?: Omit<Stripe.PaymentLink, 'line_items'>;
};

// Plan Types
type PlanOmissions = 'product' | 'interval' | 'currency';

export type StripeCreatePlanDto = CreatePlanDto<
  typeof PlanCadenceEnum,
  typeof CurrencyEnum,
  { stripe: 'stripe' }
> & {
  extraFields?: Omit<Stripe.PlanCreateParams, PlanOmissions>;
};

export type StripeUpdatePlanDto = UpdatePlanDto<
  typeof PlanCadenceEnum,
  typeof CurrencyEnum,
  { stripe: 'stripe' }
> & {
  extraFields?: Omit<Stripe.PlanUpdateParams, PlanOmissions>;
};

export type StripePlanDto = PlanDto<
  typeof PlanCadenceEnum,
  typeof CurrencyEnum,
  { stripe: 'stripe' }
> & {
  extraFields?: Omit<Stripe.Plan, PlanOmissions>;
};

// Subscription Types
type SubscriptionOmissions = 'items' | 'customer';

export type StripeCreateSubscriptionDto<PartyType> = CreateSubscriptionDto<
  PartyType,
  { stripe: 'stripe' }
> & {
  extraFields?: Omit<Stripe.SubscriptionCreateParams, SubscriptionOmissions>;
};

export type StripeUpdateSubscriptionDto<PartyType> = UpdateSubscriptionDto<
  PartyType,
  { stripe: 'stripe' }
> & {
  extraFields?: Omit<Stripe.SubscriptionUpdateParams, SubscriptionOmissions>;
};

export type StripeSubscriptionDto<PartyType> = SubscriptionDto<
  PartyType,
  { stripe: 'stripe' }
> & {
  extraFields?: Omit<Stripe.Subscription, SubscriptionOmissions>;
};
