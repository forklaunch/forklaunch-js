import { schemaValidator } from '@forklaunch/blueprint-core';
import { sdkClient } from '@forklaunch/core/http';
import { billingPortalSdkRouter } from './api/routes/billingPortal.routes';
import { checkoutSessionSdkRouter } from './api/routes/checkoutSession.routes';
import { paymentLinkSdkRouter } from './api/routes/paymentLink.routes';
import { planSdkRouter } from './api/routes/plan.routes';
import { subscriptionSdkRouter } from './api/routes/subscription.routes';
import { webhookSdkRouter } from './api/routes/webhook.routes';

//! creates an instance of the sdkClient
export const billingSdkClient = sdkClient(schemaValidator, {
  billingPortal: billingPortalSdkRouter,
  checkoutSession: checkoutSessionSdkRouter,
  paymentLink: paymentLinkSdkRouter,
  plan: planSdkRouter,
  subscription: subscriptionSdkRouter,
  webhook: webhookSdkRouter
});
export type BillingSdkClient = typeof billingSdkClient;
