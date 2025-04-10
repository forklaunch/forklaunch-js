import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { OrganizationController } from '../controllers/organization.controller';
import { SchemaDependencies } from '../registrations';

export const OrganizationRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'OrganizationService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/organization', openTelemetryCollector);

  const controller = OrganizationController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    // Create organization
    createOrganization: router.post('/', controller.createOrganization),

    // Get organization by ID
    getOrganization: router.get('/:id', controller.getOrganization),

    // Update organization by ID
    updateOrganization: router.put('/', controller.updateOrganization),

    // Delete organization by ID
    deleteOrganization: router.delete('/:id', controller.deleteOrganization)
  };
};
