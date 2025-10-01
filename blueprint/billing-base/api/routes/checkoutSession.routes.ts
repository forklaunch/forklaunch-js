import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createCheckoutSession,
  expireCheckoutSession,
  getCheckoutSession,
  handleCheckoutFailure,
  handleCheckoutSuccess
} from '../controllers/checkoutSession.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const checkoutSessionRouter = forklaunchRouter(
  '/checkout-session',
  schemaValidator,
  openTelemetryCollector
);

checkoutSessionRouter.post('/', createCheckoutSession);
checkoutSessionRouter.get('/:id', getCheckoutSession);
checkoutSessionRouter.get('/:id/expire', expireCheckoutSession);
checkoutSessionRouter.get('/:id/success', handleCheckoutSuccess);
checkoutSessionRouter.get('/:id/failure', handleCheckoutFailure);
