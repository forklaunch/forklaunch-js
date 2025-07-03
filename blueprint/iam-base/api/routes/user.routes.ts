import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { UserController } from '../controllers/user.controller';

export const UserRoutes = (
  scopedUserServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'UserService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/user',
    SchemaValidator(),
    openTelemetryCollector
  );
  const controller = UserController(
    scopedUserServiceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createUser)
    .post('/batch', controller.createBatchUsers)
    .get('/:id', controller.getUser)
    .get('/batch', controller.getBatchUsers)
    .put('/', controller.updateUser)
    .put('/batch', controller.updateBatchUsers)
    .delete('/:id', controller.deleteUser)
    .delete('/batch', controller.deleteBatchUsers)
    .get('/:id/verify-role/:roleId', controller.verifyHasRole)
    .get(
      '/:id/verify-permission/:permissionId',
      controller.verifyHasPermission
    );
};
