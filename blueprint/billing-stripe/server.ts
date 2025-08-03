import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import { sdkClient } from '@forklaunch/core/http';
import dotenv from 'dotenv';
import {
  billingPortalRouter,
  billingPortalSdkRouter
} from './api/routes/billingPortal.routes';
import {
  checkoutSessionRouter,
  checkoutSessionSdkRouter
} from './api/routes/checkoutSession.routes';
import {
  paymentLinkRouter,
  paymentLinkSdkRouter
} from './api/routes/paymentLink.routes';
import { planRouter, planSdkRouter } from './api/routes/plan.routes';
import {
  subscriptionRouter,
  subscriptionSdkRouter
} from './api/routes/subscription.routes';
import { webhookRouter, webhookSdkRouter } from './api/routes/webhook.routes';
import { createDependencies } from './registrations';

//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
export const { ci, tokens } = createDependencies(envFilePath);
const schemaValidator = SchemaValidator();

//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

//! creates an instance of forklaunchExpress
const app = forklaunchExpress(schemaValidator, openTelemetryCollector);

//! resolves the host, port, and version from the configuration
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use(billingPortalRouter);
app.use(checkoutSessionRouter);
app.use(paymentLinkRouter);
app.use(planRouter);
app.use(subscriptionRouter);
app.use(webhookRouter);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 Billing Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});

export const billingSdk = sdkClient(schemaValidator, {
  billingPortal: billingPortalSdkRouter,
  checkoutSession: checkoutSessionSdkRouter,
  paymentLink: paymentLinkSdkRouter,
  plan: planSdkRouter,
  subscription: subscriptionSdkRouter,
  webhook: webhookSdkRouter
});
