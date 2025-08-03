import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';

const schemaValidator = SchemaValidator();
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const checkoutSessionServiceFactory = ci.scopedResolver(
  tokens.CheckoutSessionService
);

export type CheckoutSessionServiceFactory =
  typeof checkoutSessionServiceFactory;

export const checkoutSessionRouter = forklaunchRouter(
  '/checkout-session',
  schemaValidator,
  openTelemetryCollector
);
const controller = CheckoutSessionController(
  checkoutSessionServiceFactory,
  openTelemetryCollector
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
