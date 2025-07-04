import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';

export const CheckoutSessionRoutes = (
  serviceFactory: ScopedDependencyFactory<
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
    serviceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createCheckoutSession)
    .get('/:id', controller.getCheckoutSession)
    .delete('/:id/expire', controller.expireCheckoutSession)
    .get('/:id/success', controller.handleCheckoutSuccess)
    .get('/:id/failure', controller.handleCheckoutFailure);
};
