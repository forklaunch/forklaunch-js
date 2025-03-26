import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';
import { ConfigShapes } from '../registrations';

export const CheckoutSessionRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ConfigShapes,
    'CheckoutSessionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/checkout-session', openTelemetryCollector);

  const controller = new CheckoutSessionController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    createCheckoutSession: router.post('/', controller.createCheckoutSession),
    getCheckoutSession: router.get('/:id', controller.getCheckoutSession),
    expireCheckoutSession: router.delete(
      '/:id/expire',
      controller.expireCheckoutSession
    ),
    handleCheckoutSuccess: router.get(
      '/:id/success',
      controller.handleCheckoutSuccess
    ),
    handleCheckoutFailure: router.get(
      '/:id/failure',
      controller.handleCheckoutFailure
    )
  };
};
