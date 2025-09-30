import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  cancelSubscription,
  createSubscription,
  deleteSubscription,
  getOrganizationSubscription,
  getSubscription,
  getUserSubscription,
  listSubscriptions,
  resumeSubscription,
  updateSubscription
} from '../controllers/subscription.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const subscriptionRouter = forklaunchRouter(
  '/subscription',
  schemaValidator,
  openTelemetryCollector
);

subscriptionRouter.post('/', createSubscription);
subscriptionRouter.get('/', listSubscriptions);
subscriptionRouter.get('/user/:id', getUserSubscription);
subscriptionRouter.get('/organization/:id', getOrganizationSubscription);
subscriptionRouter.get('/:id/cancel', cancelSubscription);
subscriptionRouter.get('/:id/resume', resumeSubscription);
subscriptionRouter.get('/:id', getSubscription);
subscriptionRouter.put('/:id', updateSubscription);
subscriptionRouter.delete('/:id', deleteSubscription);
