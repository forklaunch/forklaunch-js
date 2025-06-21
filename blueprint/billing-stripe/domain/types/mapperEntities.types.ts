import {
  BillingPortal,
  CheckoutSession,
  PaymentLink,
  Plan,
  Subscription
} from '../../persistence/entities';

export type BillingPortalEntities = {
  BillingPortalMapper: BillingPortal;
  CreateBillingPortalMapper: BillingPortal;
  UpdateBillingPortalMapper: BillingPortal;
};

export type CheckoutSessionEntities = {
  CheckoutSessionMapper: CheckoutSession;
  CreateCheckoutSessionMapper: CheckoutSession;
  UpdateCheckoutSessionMapper: CheckoutSession;
};

export type PaymentLinkEntities = {
  PaymentLinkMapper: PaymentLink;
  CreatePaymentLinkMapper: PaymentLink;
  UpdatePaymentLinkMapper: PaymentLink;
};

export type PlanEntities = {
  PlanMapper: Plan;
  CreatePlanMapper: Plan;
  UpdatePlanMapper: Plan;
};

export type SubscriptionEntities = {
  SubscriptionMapper: Subscription;
  CreateSubscriptionMapper: Subscription;
  UpdateSubscriptionMapper: Subscription;
};
