import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { SdkClient } from '@forklaunch/core/http';
import { CheckoutSessionRoutes } from './api/routes/checkoutSession.routes';
import { PaymentLinkRoutes } from './api/routes/paymentLink.routes';
import { PlanRoutes } from './api/routes/plan.routes';
import { SubscriptionRoutes } from './api/routes/subscription.routes';
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
  const checkoutSessionServiceFactory = ci.scopedResolver(
    tokens.CheckoutSessionService
  );
  const paymentLinkServiceFactory = ci.scopedResolver(
    tokens.PaymentLinkService
  );
  const planServiceFactory = ci.scopedResolver(tokens.PlanService);
  const subscriptionServiceFactory = ci.scopedResolver(
    tokens.SubscriptionService
  );
  //! constructs the necessary routes using the appropriate Routes functions
  const checkoutSessionRoutes = CheckoutSessionRoutes(
    checkoutSessionServiceFactory,
    openTelemetryCollector
  );
  const paymentLinkRoutes = PaymentLinkRoutes(
    paymentLinkServiceFactory,
    openTelemetryCollector
  );
  const planRoutes = PlanRoutes(planServiceFactory, openTelemetryCollector);
  const subscriptionRoutes = SubscriptionRoutes(
    subscriptionServiceFactory,
    openTelemetryCollector
  );
  //! mounts the routes to the app
  app.use(checkoutSessionRoutes);
  app.use(paymentLinkRoutes);
  app.use(planRoutes);
  app.use(subscriptionRoutes);
  //! starts the server
  app.listen(port, host, () => {
    openTelemetryCollector.info(
      `🎉 Billing Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the SdkClient for use with the UniversalSDK client
export type BillingSdkClient = SdkClient<
  [
    typeof CheckoutSessionRoutes,
    typeof PaymentLinkRoutes,
    typeof PlanRoutes,
    typeof SubscriptionRoutes
  ]
>;
