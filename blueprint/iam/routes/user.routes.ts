import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { configValidator } from '../bootstrapper';
import { UserController } from '../controllers/user.controller';

export const UserRoutes = (
  scopedUserServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    typeof configValidator,
    'userService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/user', openTelemetryCollector);
  const controller = new UserController(
    scopedUserServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    // Create user
    createUser: router.post('/', controller.createUser),

    // Create batch users
    createBatchUsers: router.post('/batch', controller.createBatchUsers),

    // Get user by ID
    getUser: router.get('/:id', controller.getUser),

    // Get batch users by IDs
    getBatchUsers: router.get('/batch', controller.getBatchUsers),

    // Update user by ID
    updateUser: router.put('/', controller.updateUser),

    // Update batch users by IDs
    updateBatchUsers: router.put('/batch', controller.updateBatchUsers),

    // Delete user by ID
    deleteUser: router.delete('/:id', controller.deleteUser),

    // Delete batch users by IDs
    deleteBatchUsers: router.delete('/batch', controller.deleteBatchUsers),

    // Verify user has a role
    verifyHasRole: router.get(
      '/:id/verify-role/:roleId',
      controller.verifyHasRole
    ),

    // Verify user has a permission
    verifyHasPermission: router.get(
      '/:id/verify-permission/:permissionId',
      controller.verifyHasPermission
    )
  };
};
