import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';

export const CheckoutSessionRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'CheckoutSessionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/checkout-session',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = CheckoutSessionController(
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
