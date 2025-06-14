// TODO
import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { BillingPortalController } from '../controllers/billingPortal.controller';

export const BillingPortalRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'BillingPortalService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/billing-portal',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = BillingPortalController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    createBillingPortalSession: router.post(
      '/',
      controller.createBillingPortalSession
    ),
    getBillingPortalSession: router.get(
      '/:id',
      controller.getBillingPortalSession
    ),
    updateBillingPortalSession: router.put(
      '/:id',
      controller.updateBillingPortalSession
    ),
    expireBillingPortalSession: router.delete(
      '/:id',
      controller.expireBillingPortalSession
    )
  };
};
