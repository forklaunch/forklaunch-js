import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SubscriptionController } from '../controllers/subscription.controller';
import { SchemaDependencies } from '../registrations';

export const SubscriptionRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'SubscriptionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/subscription', openTelemetryCollector);

  const controller = SubscriptionController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    createSubscription: router.post('/', controller.createSubscription),
    getSubscription: router.get('/:id', controller.getSubscription),
    getUserSubscription: router.get(
      '/user/:id',
      controller.getUserSubscription
    ),
    getOrganizationSubscription: router.get(
      '/organization/:id',
      controller.getOrganizationSubscription
    ),
    updateSubscription: router.put('/:id', controller.updateSubscription),
    deleteSubscription: router.delete('/:id', controller.deleteSubscription),
    listSubscriptions: router.get('/', controller.listSubscriptions),
    cancelSubscription: router.get(
      '/:id/cancel',
      controller.cancelSubscription
    ),
    resumeSubscription: router.get('/:id/resume', controller.resumeSubscription)
  };
};
