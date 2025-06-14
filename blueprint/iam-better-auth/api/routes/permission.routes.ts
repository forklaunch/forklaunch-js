import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { PermissionController } from '../controllers/permission.controller';

export const PermissionRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'PermissionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/permission',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = PermissionController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    // Create a permission
    createPermission: router.post('/', controller.createPermission),

    // Create batch permissions
    createBatchPermissions: router.post(
      '/batch',
      controller.createBatchPermissions
    ),

    // Get a permission by ID
    getPermission: router.get('/:id', controller.getPermission),

    // Get batch permissions by IDs
    getBatchPermissions: router.get('/batch', controller.getBatchPermissions),

    // Update a permission by ID
    updatePermission: router.put('/', controller.updatePermission),

    // Update batch permissions by IDs
    updateBatchPermissions: router.put(
      '/batch',
      controller.updateBatchPermissions
    ),

    // Delete a permission by ID
    deletePermission: router.delete('/:id', controller.deletePermission),

    // Delete batch permissions by IDs
    deleteBatchPermissions: router.delete(
      '/batch',
      controller.deleteBatchPermissions
    )
  };
};
