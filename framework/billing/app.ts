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

const app = forklaunchExpress();
const port = Number(process.env.PORT) || 8001;

bootstrap((ci) => {
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

  app.listen(port, () => {
    console.log(
      `🎉 Billing Server is running at http://localhost:${port} 🎉.\nAn API reference can be accessed at http://localhost:${port}/api${process.env.VERSION ?? '/v1'}${process.env.SWAGGER_PATH ?? '/swagger'}`
    );
  });
});

export type BillingApiClient = ApiClient<{
  checkoutSession: typeof CheckoutSessionRoutes;
  paymentLink: typeof PaymentLinkRoutes;
  plan: typeof PlanRoutes;
  subscription: typeof SubscriptionRoutes;
}>;
