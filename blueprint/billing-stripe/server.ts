import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import dotenv from 'dotenv';
import { CheckoutSessionRoutes } from './api/routes/checkoutSession.routes';
import { PaymentLinkRoutes } from './api/routes/paymentLink.routes';
import { PlanRoutes } from './api/routes/plan.routes';
import { SubscriptionRoutes } from './api/routes/subscription.routes';
import { WebhookRoutes } from './api/routes/webhook.routes';
import { createDependencies } from './registrations';
//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
const { serviceDependencies, tokens } = createDependencies();
const ci = serviceDependencies.validateConfigSingletons(envFilePath);
//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
//! creates an instance of forklaunchExpress
const app = forklaunchExpress(SchemaValidator(), openTelemetryCollector);
//! resolves the host, port, and version from the configuration
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);
//! resolves the necessary services from the configuration
const checkoutSessionServiceFactory = ci.scopedResolver(
  tokens.CheckoutSessionService
);
const paymentLinkServiceFactory = ci.scopedResolver(tokens.PaymentLinkService);
const planServiceFactory = ci.scopedResolver(tokens.PlanService);
const subscriptionServiceFactory = ci.scopedResolver(
  tokens.SubscriptionService
);
const webhookServiceFactory = ci.scopedResolver(tokens.WebhookService);
//! constructs the necessary routes using the appropriate Routes functions
export const checkoutSessionRoutes = CheckoutSessionRoutes(
  checkoutSessionServiceFactory,
  openTelemetryCollector
);
export const paymentLinkRoutes = PaymentLinkRoutes(
  paymentLinkServiceFactory,
  openTelemetryCollector
);
export const planRoutes = PlanRoutes(
  planServiceFactory,
  openTelemetryCollector
);
export const subscriptionRoutes = SubscriptionRoutes(
  subscriptionServiceFactory,
  openTelemetryCollector
);
export const webhookRoutes = WebhookRoutes(
  webhookServiceFactory,
  openTelemetryCollector
);
//! mounts the routes to the app
app.use(checkoutSessionRoutes);
app.use(paymentLinkRoutes);
app.use(planRoutes);
app.use(subscriptionRoutes);
app.use(webhookRoutes);
//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 Billing Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});
