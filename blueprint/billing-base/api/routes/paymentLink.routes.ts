import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { PaymentLinkController } from '../controllers/paymentLink.controller';

export const PaymentLinkRoutes = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'PaymentLinkService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/payment-link',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = PaymentLinkController(
    serviceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createPaymentLink)
    .get('/:id', controller.getPaymentLink)
    .put('/:id', controller.updatePaymentLink)
    .get('/', controller.listPaymentLinks)
    .delete('/:id', controller.expirePaymentLink)
    .get('/:id/success', controller.handlePaymentSuccess)
    .get('/:id/failure', controller.handlePaymentFailure);
};
