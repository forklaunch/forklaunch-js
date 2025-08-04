import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { PaymentLinkController } from '../controllers/paymentLink.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const paymentLinkServiceFactory = ci.scopedResolver(tokens.PaymentLinkService);

export type PaymentLinkServiceFactory = typeof paymentLinkServiceFactory;

export const paymentLinkRouter = forklaunchRouter(
  '/payment-link',
  schemaValidator,
  openTelemetryCollector
);
const controller = PaymentLinkController(
  paymentLinkServiceFactory,
  openTelemetryCollector
);

paymentLinkRouter.post('/', controller.createPaymentLink);
paymentLinkRouter.get('/:id', controller.getPaymentLink);
paymentLinkRouter.put('/:id', controller.updatePaymentLink);
paymentLinkRouter.get('/', controller.listPaymentLinks);
paymentLinkRouter.delete('/:id', controller.expirePaymentLink);
paymentLinkRouter.get('/:id/success', controller.handlePaymentSuccess);
paymentLinkRouter.get('/:id/failure', controller.handlePaymentFailure);

export const paymentLinkSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  paymentLinkRouter
);
