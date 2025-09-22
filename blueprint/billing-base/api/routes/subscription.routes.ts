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
subscriptionRouter.get('/:id', getSubscription);
subscriptionRouter.get('/user/:id', getUserSubscription);
subscriptionRouter.get('/organization/:id', getOrganizationSubscription);
subscriptionRouter.put('/:id', updateSubscription);
subscriptionRouter.delete('/:id', deleteSubscription);
subscriptionRouter.get('/', listSubscriptions);
subscriptionRouter.get('/:id/cancel', cancelSubscription);
subscriptionRouter.get('/:id/resume', resumeSubscription);
