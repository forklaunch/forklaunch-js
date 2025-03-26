import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { PlanController } from '../controllers/plan.controller';
import { ConfigShapes } from '../registrations';

export const PlanRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ConfigShapes,
    'PlanService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter('/plan', openTelemetryCollector);

  const controller = new PlanController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    createPlan: router.post('/', controller.createPlan),
    getPlan: router.get('/:id', controller.getPlan),
    updatePlan: router.put('/', controller.updatePlan),
    deletePlan: router.delete('/:id', controller.deletePlan),
    listPlans: router.get('/', controller.listPlans)
  };
};
