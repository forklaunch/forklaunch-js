import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { configValidator } from '../bootstrapper';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';

export const CheckoutSessionRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    typeof configValidator,
    'checkoutSessionService'
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
