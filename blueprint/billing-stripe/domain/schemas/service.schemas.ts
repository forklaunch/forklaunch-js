//! NOTE: THIS FILE WILL BE DELETED UPON EJECTION. EDIT AT YOUR OWN RISK.
import { schemaValidator } from '@forklaunch/blueprint-core';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  StripeBillingPortalServiceSchemas,
  StripeCheckoutSessionServiceSchemas,
  StripePaymentLinkServiceSchemas,
  StripePlanServiceSchemas,
  StripeSubscriptionServiceSchemas
} from '@forklaunch/implementation-billing-stripe/schemas';

export const {
  BillingPortalSchemas,
  CheckoutSessionSchemas,
  PaymentLinkSchemas,
  PlanSchemas,
  SubscriptionSchemas
} = mapServiceSchemas(
  {
    BillingPortalSchemas: StripeBillingPortalServiceSchemas,
    CheckoutSessionSchemas: StripeCheckoutSessionServiceSchemas,
    PaymentLinkSchemas: StripePaymentLinkServiceSchemas,
    PlanSchemas: StripePlanServiceSchemas,
    SubscriptionSchemas: StripeSubscriptionServiceSchemas
  },
  {
    validator: schemaValidator
  }
);
