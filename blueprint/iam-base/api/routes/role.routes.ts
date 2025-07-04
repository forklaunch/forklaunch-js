import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { RoleController } from '../controllers/role.controller';

export const RoleRoutes = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'RoleService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/role',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = RoleController(serviceFactory, openTelemetryCollector);

  return router
    .post('/', controller.createRole)
    .post('/batch', controller.createBatchRoles)
    .get('/:id', controller.getRole)
    .get('/batch', controller.getBatchRoles)
    .put('/', controller.updateRole)
    .put('/batch', controller.updateBatchRoles)
    .delete('/:id', controller.deleteRole)
    .delete('/batch', controller.deleteBatchRoles);
};
