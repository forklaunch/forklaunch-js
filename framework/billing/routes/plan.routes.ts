import { forklaunchRouter } from '@forklaunch/framework-core';
import { PlanController } from '../controllers/plan.controller';

export const router = forklaunchRouter('/plan');

export const PlanRoutes = (controller: PlanController) => ({
  router,
  createPlan: router.post('/', controller.createPlan),
  getPlan: router.get('/:id', controller.getPlan),
  updatePlan: router.put('/', controller.updatePlan),
  deletePlan: router.delete('/:id', controller.deletePlan),
  listPlans: router.get('/', controller.listPlans)
});
