import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { CheckoutSessionController } from './controllers/checkoutSession.controller';
import { PaymentLinkController } from './controllers/paymentLink.controller';
import { PlanController } from './controllers/plan.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { CheckoutSessionRoutes } from './routes/checkoutSession.routes';
import { PaymentLinkRoutes } from './routes/paymentLink.routes';
import { PlanRoutes } from './routes/plan.routes';
import { SubscriptionRoutes } from './routes/subscription.routes';
//! bootstrap function that initializes the service application
bootstrap((ci) => {
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress();
  //! resolves the host, port, and version from the configuration
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const swaggerPath = ci.resolve('swaggerPath');
  //! resolves the necessary services from the configuration
  const scopedCheckoutSessionServiceFactory = ci.scopedResolver(
    'checkoutSessionService'
  );
  const scopedPaymentLinkServiceFactory =
    ci.scopedResolver('paymentLinkService');
  const scopedPlanServiceFactory = ci.scopedResolver('planService');
  const scopedSubscriptionServiceFactory = ci.scopedResolver(
    'subscriptionService'
  );
  //! constructs the necessary routes using the appropriate Routes functions
  const checkoutSessionRoutes = CheckoutSessionRoutes(
    new CheckoutSessionController(scopedCheckoutSessionServiceFactory)
  );
  const paymentLinkRoutes = PaymentLinkRoutes(
    new PaymentLinkController(scopedPaymentLinkServiceFactory)
  );
  const planRoutes = PlanRoutes(new PlanController(scopedPlanServiceFactory));
  const subscriptionRoutes = SubscriptionRoutes(
    new SubscriptionController(scopedSubscriptionServiceFactory)
  );
  //! mounts the routes to the app
  app.use(checkoutSessionRoutes.router);
  app.use(paymentLinkRoutes.router);
  app.use(planRoutes.router);
  app.use(subscriptionRoutes.router);
  //! starts the server
  app.listen(port, host, () => {
    console.log(
      `🎉 Billing Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api${version}${swaggerPath}`
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
