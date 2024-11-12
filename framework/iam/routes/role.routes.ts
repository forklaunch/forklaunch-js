import { forklaunchRouter } from '@forklaunch/framework-core';
import { RoleController } from '../controllers/role.controller';

export const router = forklaunchRouter('/role');

export const RoleRoutes = <ConfigInjectorScope>(
  controller: RoleController<ConfigInjectorScope>
) => ({
  router,

  // Create role
  createRole: router.post('/', controller.createRole),

  // Create batch roles
  createBatchRoles: router.post('/batch', controller.createBatchRoles),

  // Get role by ID
  getRole: router.get('/:id', controller.getRole),

  // Get batch roles by IDs
  getBatchRoles: router.get('/batch', controller.getBatchRoles),

  // Update role by ID
  updateRole: router.put('/', controller.updateRole),

  // Update batch roles by IDs
  updateBatchRoles: router.put('/batch', controller.updateBatchRoles),

  // Delete role by ID
  deleteRole: router.delete('/:id', controller.deleteRole),

  // Delete batch roles by IDs
  deleteBatchRoles: router.delete('/batch', controller.deleteBatchRoles)
});
