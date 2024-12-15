import { forklaunchRouter } from '@forklaunch/framework-core';
import { OrganizationController } from '../controllers/organization.controller';

export const router = forklaunchRouter('/organization');

export const OrganizationRoutes = (controller: OrganizationController) => ({
  router,

  // Create organization
  createOrganization: router.post('/', controller.createOrganization),

  // Get organization by ID
  getOrganization: router.get('/:id', controller.getOrganization),

  // Update organization by ID
  updateOrganization: router.put('/', controller.updateOrganization),

  // Delete organization by ID
  deleteOrganization: router.delete('/:id', controller.deleteOrganization)
});
