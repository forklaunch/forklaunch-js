import { forklaunchRouter, schemaValidator } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  updateSubscription
} from '../controllers/subscription.controller';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);

export const subscriptionRouter = forklaunchRouter(
  '/subscription',
  schemaValidator,
  openTelemetryCollector
);

export const createSubscriptionRoute = subscriptionRouter.post(
  '/',
  createSubscription
);
export const listSubscriptionsRoute = subscriptionRouter.get(
  '/',
  listSubscriptions
);
export const updateSubscriptionRoute = subscriptionRouter.put(
  '/',
  updateSubscription
);
export const getSubscriptionRoute = subscriptionRouter.get(
  '/:id',
  getSubscription
);
export const deleteSubscriptionRoute = subscriptionRouter.delete(
  '/:id',
  deleteSubscription
);
