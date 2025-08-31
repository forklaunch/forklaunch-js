import { SchemaValidator, schemaValidator } from '@forklaunch/blueprint-core';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  BaseBillingPortalServiceSchemas,
  BaseCheckoutSessionServiceSchemas,
  BasePaymentLinkServiceSchemas,
  BasePlanServiceSchemas,
  BaseSubscriptionServiceSchemas
} from '@forklaunch/implementation-billing-base/schemas';

const schemas = mapServiceSchemas(
  {
    BillingPortalSchemas: BaseBillingPortalServiceSchemas<SchemaValidator>,
    CheckoutSessionSchemas: BaseCheckoutSessionServiceSchemas<SchemaValidator>,
    PaymentLinkSchemas: BasePaymentLinkServiceSchemas<SchemaValidator>,
    PlanSchemas: BasePlanServiceSchemas<SchemaValidator>,
    SubscriptionSchemas: BaseSubscriptionServiceSchemas<SchemaValidator>
  },
  {
    uuidId: true,
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
