import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { SubscriptionController } from '../controllers/subscription.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const subscriptionServiceFactory = ci.scopedResolver(
  tokens.SubscriptionService
);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export type SubscriptionServiceFactory = typeof subscriptionServiceFactory;

export const subscriptionRouter = forklaunchRouter(
  '/subscription',
  schemaValidator,
  openTelemetryCollector
);
const controller = SubscriptionController(
  subscriptionServiceFactory,
  openTelemetryCollector,
  HMAC_SECRET_KEY
);

subscriptionRouter.post('/', controller.createSubscription);
subscriptionRouter.get('/:id', controller.getSubscription);
subscriptionRouter.get('/user/:id', controller.getUserSubscription);
subscriptionRouter.get(
  '/organization/:id',
  controller.getOrganizationSubscription
);
subscriptionRouter.put('/:id', controller.updateSubscription);
subscriptionRouter.delete('/:id', controller.deleteSubscription);
subscriptionRouter.get('/', controller.listSubscriptions);
subscriptionRouter.get('/:id/cancel', controller.cancelSubscription);
subscriptionRouter.get('/:id/resume', controller.resumeSubscription);

export const subscriptionSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  subscriptionRouter
);
