import { forklaunchExpress } from '@forklaunch/blueprint-core';
import { ApiClient } from '@forklaunch/core/http';
import { bootstrap } from './bootstrapper';
import { CheckoutSessionRoutes } from './routes/checkoutSession.routes';
import { PaymentLinkRoutes } from './routes/paymentLink.routes';
import { PlanRoutes } from './routes/plan.routes';
import { SubscriptionRoutes } from './routes/subscription.routes';
//! bootstrap function that initializes the service application
bootstrap((ci) => {
  //! resolves the openTelemetryCollector from the configuration
  const openTelemetryCollector = ci.resolve('OpenTelemetryCollector');
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress(openTelemetryCollector);
  //! resolves the host, port, and version from the configuration
  const host = ci.resolve('HOST');
  const port = ci.resolve('PORT');
  const version = ci.resolve('VERSION');
  const docsPath = ci.resolve('DOCS_PATH');
  //! resolves the necessary services from the configuration
  const scopedCheckoutSessionServiceFactory = ci.scopedResolver(
    'CheckoutSessionService'
  );
  const scopedPaymentLinkServiceFactory =
    ci.scopedResolver('PaymentLinkService');
  const scopedPlanServiceFactory = ci.scopedResolver('PlanService');
  const scopedSubscriptionServiceFactory = ci.scopedResolver(
    'SubscriptionService'
  );
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
  //! mounts the routes to the app
  app.use(checkoutSessionRoutes.router);
  app.use(paymentLinkRoutes.router);
  app.use(planRoutes.router);
  app.use(subscriptionRoutes.router);
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
}>;
