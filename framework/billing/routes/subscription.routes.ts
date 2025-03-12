import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { configValidator } from '../bootstrapper';
import { SubscriptionController } from '../controllers/subscription.controller';

export const SubscriptionRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    typeof configValidator,
    'subscriptionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/subscription', openTelemetryCollector);

  const controller = new SubscriptionController(
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
