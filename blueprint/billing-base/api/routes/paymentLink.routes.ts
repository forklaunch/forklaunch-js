import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { PaymentLinkController } from '../controllers/paymentLink.controller';

export const PaymentLinkRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
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
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    createPaymentLink: router.post('/', controller.createPaymentLink),
    getPaymentLink: router.get('/:id', controller.getPaymentLink),
    updatePaymentLink: router.put('/:id', controller.updatePaymentLink),
    listPaymentLinks: router.get('/', controller.listPaymentLinks),
    expirePaymentLink: router.delete('/:id', controller.expirePaymentLink),
    handlePaymentSuccess: router.get(
      '/:id/success',
      controller.handlePaymentSuccess
    ),
    handlePaymentFailure: router.get(
      '/:id/failure',
      controller.handlePaymentFailure
    )
  };
};
