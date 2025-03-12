import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { configValidator } from '../bootstrapper';
import { OrganizationController } from '../controllers/organization.controller';

export const OrganizationRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    typeof configValidator,
    'organizationService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/organization', openTelemetryCollector);

  const controller = new OrganizationController(
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
