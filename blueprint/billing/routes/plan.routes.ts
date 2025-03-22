import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { configValidator } from '../bootstrapper';
import { PlanController } from '../controllers/plan.controller';

export const PlanRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    typeof configValidator,
    'planService'
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
