// TODO
import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { BillingPortalController } from '../controllers/billingPortal.controller';

export const BillingPortalRoutes = (
  serviceFactory: ScopedDependencyFactory<
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
    serviceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createBillingPortalSession)
    .get('/:id', controller.getBillingPortalSession)
    .put('/:id', controller.updateBillingPortalSession)
    .delete('/:id', controller.expireBillingPortalSession);
};
