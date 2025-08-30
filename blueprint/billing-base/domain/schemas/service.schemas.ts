//! NOTE: THIS FILE WILL BE DELETED UPON EJECTION. EDIT AT YOUR OWN RISK.
import { schemaValidator } from '@forklaunch/blueprint-core';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  BaseBillingPortalServiceSchemas,
  BaseCheckoutSessionServiceSchemas,
  BasePaymentLinkServiceSchemas,
  BasePlanServiceSchemas,
  BaseSubscriptionServiceSchemas
} from '@forklaunch/implementation-billing-base/schemas';

export const {
  BillingPortalSchemas,
  CheckoutSessionSchemas,
  PaymentLinkSchemas,
  PlanSchemas,
  SubscriptionSchemas
} = mapServiceSchemas(
  {
    BillingPortalSchemas: BaseBillingPortalServiceSchemas,
    CheckoutSessionSchemas: BaseCheckoutSessionServiceSchemas,
    PaymentLinkSchemas: BasePaymentLinkServiceSchemas,
    PlanSchemas: BasePlanServiceSchemas,
    SubscriptionSchemas: BaseSubscriptionServiceSchemas
  },
  {
    validator: schemaValidator,
    uuidId: true
  }
);
