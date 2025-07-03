import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { OrganizationController } from '../controllers/organization.controller';

export const OrganizationRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'OrganizationService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/organization',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = OrganizationController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createOrganization)
    .get('/:id', controller.getOrganization)
    .put('/', controller.updateOrganization)
    .delete('/:id', controller.deleteOrganization);
};
