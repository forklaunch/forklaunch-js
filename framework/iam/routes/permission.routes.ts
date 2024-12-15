import { forklaunchRouter } from '@forklaunch/framework-core';
import { PermissionController } from '../controllers/permission.controller';

export const router = forklaunchRouter('/permission');

export const PermissionRoutes = (controller: PermissionController) => ({
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
});
