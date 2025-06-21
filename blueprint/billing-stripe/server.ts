import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { ApiClient } from '@forklaunch/core/http';
import { CheckoutSessionRoutes } from './api/routes/checkoutSession.routes';
import { PaymentLinkRoutes } from './api/routes/paymentLink.routes';
import { PlanRoutes } from './api/routes/plan.routes';
import { SubscriptionRoutes } from './api/routes/subscription.routes';
import { WebhookRoutes } from './api/routes/webhook.routes';
import { bootstrap } from './bootstrapper';
//! bootstrap function that initializes the service application
bootstrap((ci, tokens) => {
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
  const scopedCheckoutSessionServiceFactory = ci.scopedResolver(
    tokens.CheckoutSessionService
  );
  const scopedPaymentLinkServiceFactory = ci.scopedResolver(
    tokens.PaymentLinkService
  );
  const scopedPlanServiceFactory = ci.scopedResolver(tokens.PlanService);
  const scopedSubscriptionServiceFactory = ci.scopedResolver(
    tokens.SubscriptionService
  );
  const scopedWebhookServiceFactory = ci.scopedResolver(tokens.WebhookService);
  //! constructs the necessary routes using the appropriate Routes functions
  const checkoutSessionRoutes = CheckoutSessionRoutes(
    scopedCheckoutSessionServiceFactory,
    openTelemetryCollector
  );
  const paymentLinkRoutes = PaymentLinkRoutes(
    scopedPaymentLinkServiceFactory,
    openTelemetryCollector
  );
  const planRoutes = PlanRoutes(
    scopedPlanServiceFactory,
    openTelemetryCollector
  );
  const subscriptionRoutes = SubscriptionRoutes(
    scopedSubscriptionServiceFactory,
    openTelemetryCollector
  );
  const webhookRoutes = WebhookRoutes(
    scopedWebhookServiceFactory,
    openTelemetryCollector
  );
  //! mounts the routes to the app
  app.use(checkoutSessionRoutes.router);
  app.use(paymentLinkRoutes.router);
  app.use(planRoutes.router);
  app.use(subscriptionRoutes.router);
  app.use(webhookRoutes.router);
  //! starts the server
  app.listen(port, host, () => {
    openTelemetryCollector.info(
      `🎉 Billing Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the ApiClient for use with the UniversalSDK client
export type BillingApiClient = ApiClient<{
  checkoutSession: typeof CheckoutSessionRoutes;
  paymentLink: typeof PaymentLinkRoutes;
  plan: typeof PlanRoutes;
  subscription: typeof SubscriptionRoutes;
  webhook: typeof WebhookRoutes;
}>;
