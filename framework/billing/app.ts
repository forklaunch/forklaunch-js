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

bootstrap((ci) => {
  const app = forklaunchExpress();
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const swaggerPath = ci.resolve('swaggerPath');

  const checkoutSessionRoutes = CheckoutSessionRoutes(
    new CheckoutSessionController(ci.scopedResolver('checkoutSessionService'))
  );
  const paymentLinkRoutes = PaymentLinkRoutes(
    new PaymentLinkController(ci.scopedResolver('paymentLinkService'))
  );
  const planRoutes = PlanRoutes(
    new PlanController(ci.scopedResolver('planService'))
  );
  const subscriptionRoutes = SubscriptionRoutes(
    new SubscriptionController(ci.scopedResolver('subscriptionService'))
  );
  app.use(checkoutSessionRoutes.router);
  app.use(paymentLinkRoutes.router);
  app.use(planRoutes.router);
  app.use(subscriptionRoutes.router);

  app.listen(port, host, () => {
    console.log(
      `🎉 Billing Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api${version}${swaggerPath}`
    );
  });
});

export type BillingApiClient = ApiClient<{
  checkoutSession: typeof CheckoutSessionRoutes;
  paymentLink: typeof PaymentLinkRoutes;
  plan: typeof PlanRoutes;
  subscription: typeof SubscriptionRoutes;
}>;
