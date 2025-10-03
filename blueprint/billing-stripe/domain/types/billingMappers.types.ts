import { SchemaValidator } from '@forklaunch/blueprint-core';
import { Schema } from '@forklaunch/validator';
import {
  BillingPortal,
  CheckoutSession,
  PaymentLink,
  Plan,
  Subscription
} from '../../persistence/entities';
import {
  BillingPortalMapper,
  CreateBillingPortalMapper,
  UpdateBillingPortalMapper
} from '../mappers/billingPortal.mappers';
import {
  CheckoutSessionMapper,
  CreateCheckoutSessionMapper,
  UpdateCheckoutSessionMapper
} from '../mappers/checkoutSession.mappers';
import {
  CreatePaymentLinkMapper,
  PaymentLinkMapper,
  UpdatePaymentLinkMapper
} from '../mappers/paymentLink.mappers';
import {
  CreatePlanMapper,
  PlanMapper,
  UpdatePlanMapper
} from '../mappers/plan.mappers';
import {
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from '../mappers/subscription.mappers';

// billing portal mappers
export type BillingPortalMapperTypes = {
  BillingPortalMapper: BillingPortal;
  CreateBillingPortalMapper: BillingPortal;
  UpdateBillingPortalMapper: BillingPortal;
};

// billing portal dto types
export type BillingPortalDtoTypes = {
  BillingPortalMapper: Schema<
    typeof BillingPortalMapper.schema,
    SchemaValidator
  >;
  CreateBillingPortalMapper: Schema<
    typeof CreateBillingPortalMapper.schema,
    SchemaValidator
  >;
  UpdateBillingPortalMapper: Schema<
    typeof UpdateBillingPortalMapper.schema,
    SchemaValidator
  >;
};

// checkout session mappers
export type CheckoutSessionMapperTypes = {
  CheckoutSessionMapper: CheckoutSession;
  CreateCheckoutSessionMapper: CheckoutSession;
  UpdateCheckoutSessionMapper: CheckoutSession;
};

// checkout session dto types
export type CheckoutSessionDtoTypes = {
  CheckoutSessionMapper: Schema<
    typeof CheckoutSessionMapper.schema,
    SchemaValidator
  >;
  CreateCheckoutSessionMapper: Schema<
    typeof CreateCheckoutSessionMapper.schema,
    SchemaValidator
  >;
  UpdateCheckoutSessionMapper: Schema<
    typeof UpdateCheckoutSessionMapper.schema,
    SchemaValidator
  >;
};

// payment link mappers
export type PaymentLinkMapperTypes = {
  PaymentLinkMapper: PaymentLink;
  CreatePaymentLinkMapper: PaymentLink;
  UpdatePaymentLinkMapper: PaymentLink;
};

// payment link dto types
export type PaymentLinkDtoTypes = {
  PaymentLinkMapper: Schema<typeof PaymentLinkMapper.schema, SchemaValidator>;
  CreatePaymentLinkMapper: Schema<
    typeof CreatePaymentLinkMapper.schema,
    SchemaValidator
  >;
  UpdatePaymentLinkMapper: Schema<
    typeof UpdatePaymentLinkMapper.schema,
    SchemaValidator
  >;
};

// plan mappers
export type PlanMapperTypes = {
  PlanMapper: Plan;
  CreatePlanMapper: Plan;
  UpdatePlanMapper: Plan;
};

// plan dto types
export type PlanDtoTypes = {
  PlanMapper: Schema<typeof PlanMapper.schema, SchemaValidator>;
  CreatePlanMapper: Schema<typeof CreatePlanMapper.schema, SchemaValidator>;
  UpdatePlanMapper: Schema<typeof UpdatePlanMapper.schema, SchemaValidator>;
};

// subscription mappers
export type SubscriptionMapperTypes = {
  SubscriptionMapper: Subscription;
  CreateSubscriptionMapper: Subscription;
  UpdateSubscriptionMapper: Subscription;
};

// subscription dto types
export type SubscriptionDtoTypes = {
  SubscriptionMapper: Schema<typeof SubscriptionMapper.schema, SchemaValidator>;
  CreateSubscriptionMapper: Schema<
    typeof CreateSubscriptionMapper.schema,
    SchemaValidator
  >;
  UpdateSubscriptionMapper: Schema<
    typeof UpdateSubscriptionMapper.schema,
    SchemaValidator
  >;
};
