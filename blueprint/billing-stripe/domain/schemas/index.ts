import { SchemaValidator, schemaValidator } from '@forklaunch/blueprint-core';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  StripeBillingPortalServiceSchemas,
  StripeCheckoutSessionServiceSchemas,
  StripePaymentLinkServiceSchemas,
  StripePlanServiceSchemas,
  StripeSubscriptionServiceSchemas
} from '@forklaunch/implementation-billing-stripe/schemas';

const schemas = mapServiceSchemas(
  {
    BillingPortalSchemas: StripeBillingPortalServiceSchemas<SchemaValidator>,
    CheckoutSessionSchemas:
      StripeCheckoutSessionServiceSchemas<SchemaValidator>,
    PaymentLinkSchemas: StripePaymentLinkServiceSchemas<SchemaValidator>,
    PlanSchemas: StripePlanServiceSchemas<SchemaValidator>,
    SubscriptionSchemas: StripeSubscriptionServiceSchemas<SchemaValidator>
  },
  {
    validator: schemaValidator
  }
);

export const {
  BillingPortalSchemas,
  CheckoutSessionSchemas,
  PaymentLinkSchemas,
  PlanSchemas,
  SubscriptionSchemas
} = schemas;
