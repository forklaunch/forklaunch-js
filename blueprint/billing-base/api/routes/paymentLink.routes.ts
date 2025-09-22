import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createPaymentLink,
  expirePaymentLink,
  getPaymentLink,
  handlePaymentFailure,
  handlePaymentSuccess,
  listPaymentLinks,
  updatePaymentLink
} from '../controllers/paymentLink.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const paymentLinkRouter = forklaunchRouter(
  '/payment-link',
  schemaValidator,
  openTelemetryCollector
);

paymentLinkRouter.post('/', createPaymentLink);
paymentLinkRouter.get('/:id', getPaymentLink);
paymentLinkRouter.put('/:id', updatePaymentLink);
paymentLinkRouter.get('/', listPaymentLinks);
paymentLinkRouter.delete('/:id', expirePaymentLink);
paymentLinkRouter.get('/:id/success', handlePaymentSuccess);
paymentLinkRouter.get('/:id/failure', handlePaymentFailure);
