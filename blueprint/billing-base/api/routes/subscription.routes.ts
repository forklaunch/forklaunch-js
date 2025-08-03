import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { SubscriptionController } from '../controllers/subscription.controller';

const schemaValidator = SchemaValidator();
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const subscriptionServiceFactory = ci.scopedResolver(
  tokens.SubscriptionService
);

export type SubscriptionServiceFactory = typeof subscriptionServiceFactory;

export const subscriptionRouter = forklaunchRouter(
  '/subscription',
  schemaValidator,
  openTelemetryCollector
);
const controller = SubscriptionController(
  subscriptionServiceFactory,
  openTelemetryCollector
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
