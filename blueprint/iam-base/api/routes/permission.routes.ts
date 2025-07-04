import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { PermissionController } from '../controllers/permission.controller';

export const PermissionRoutes = (
  serviceFactory: ScopedDependencyFactory<
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
    serviceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createPermission)
    .post('/batch', controller.createBatchPermissions)
    .get('/:id', controller.getPermission)
    .get('/batch', controller.getBatchPermissions)
    .put('/', controller.updatePermission)
    .put('/batch', controller.updateBatchPermissions)
    .delete('/:id', controller.deletePermission)
    .delete('/batch', controller.deleteBatchPermissions);
};
