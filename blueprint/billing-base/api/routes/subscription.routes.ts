import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { SubscriptionController } from '../controllers/subscription.controller';

export const SubscriptionRoutes = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'SubscriptionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/subscription',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = SubscriptionController(
    serviceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createSubscription)
    .get('/:id', controller.getSubscription)
    .get('/user/:id', controller.getUserSubscription)
    .get('/organization/:id', controller.getOrganizationSubscription)
    .put('/:id', controller.updateSubscription)
    .delete('/:id', controller.deleteSubscription)
    .get('/', controller.listSubscriptions)
    .get('/:id/cancel', controller.cancelSubscription)
    .get('/:id/resume', controller.resumeSubscription);
};
