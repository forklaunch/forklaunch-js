import { forklaunchRouter } from '@forklaunch/framework-core';
import { SubscriptionController } from '../controllers/subscription.controller';

export const router = forklaunchRouter('/subscription');

export const SubscriptionRoutes = (controller: SubscriptionController) => ({
  router,
  createSubscription: router.post('/', controller.createSubscription),
  getSubscription: router.get('/:id', controller.getSubscription),
  getUserSubscription: router.get('/user/:id', controller.getUserSubscription),
  getOrganizationSubscription: router.get(
    '/organization/:id',
    controller.getOrganizationSubscription
  ),
  updateSubscription: router.put('/:id', controller.updateSubscription),
  deleteSubscription: router.delete('/:id', controller.deleteSubscription),
  listSubscriptions: router.get('/', controller.listSubscriptions),
  cancelSubscription: router.get('/:id/cancel', controller.cancelSubscription),
  resumeSubscription: router.get('/:id/resume', controller.resumeSubscription)
});
