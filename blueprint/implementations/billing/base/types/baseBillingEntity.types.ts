import {
  BillingPortalDto,
  CheckoutSessionDto,
  PaymentLinkDto,
  PlanDto,
  SubscriptionDto
} from '@forklaunch/interfaces-billing/types';

// billing entity types
export type BaseBillingEntities = {
  BillingPortalEntityMapper: BillingPortalDto;
  CreateBillingPortalEntityMapper: BillingPortalDto;
  UpdateBillingPortalEntityMapper: BillingPortalDto;
};

// checkout session entity types
export type BaseCheckoutSessionEntities = {
  CheckoutSessionEntityMapper: CheckoutSessionDto;
  CreateCheckoutSessionEntityMapper: CheckoutSessionDto;
  UpdateCheckoutSessionEntityMapper: CheckoutSessionDto;
};

// payment link entity types
export type BasePaymentLinkEntities = {
  PaymentLinkEntityMapper: PaymentLinkDto;
  CreatePaymentLinkEntityMapper: PaymentLinkDto;
  UpdatePaymentLinkEntityMapper: PaymentLinkDto;
};

// plan entity types
export type BasePlanEntities = {
  PlanEntityMapper: PlanDto;
  CreatePlanEntityMapper: PlanDto;
  UpdatePlanEntityMapper: PlanDto;
};

// subscription entity types
export type BaseSubscriptionEntities = {
  SubscriptionEntityMapper: SubscriptionDto;
  CreateSubscriptionEntityMapper: SubscriptionDto;
  UpdateSubscriptionEntityMapper: SubscriptionDto;
};
