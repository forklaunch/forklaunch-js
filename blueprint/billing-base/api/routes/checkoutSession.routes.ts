import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const checkoutSessionServiceFactory = ci.scopedResolver(
  tokens.CheckoutSessionService
);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export type CheckoutSessionServiceFactory =
  typeof checkoutSessionServiceFactory;

export const checkoutSessionRouter = forklaunchRouter(
  '/checkout-session',
  schemaValidator,
  openTelemetryCollector
);
const controller = CheckoutSessionController(
  checkoutSessionServiceFactory,
  openTelemetryCollector,
  HMAC_SECRET_KEY
);

checkoutSessionRouter.post('/', controller.createCheckoutSession);
checkoutSessionRouter.get('/:id', controller.getCheckoutSession);
checkoutSessionRouter.delete('/:id/expire', controller.expireCheckoutSession);
checkoutSessionRouter.get('/:id/success', controller.handleCheckoutSuccess);
checkoutSessionRouter.get('/:id/failure', controller.handleCheckoutFailure);

export const checkoutSessionSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  checkoutSessionRouter
);
