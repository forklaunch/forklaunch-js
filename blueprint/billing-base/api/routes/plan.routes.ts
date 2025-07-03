import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { PlanController } from '../controllers/plan.controller';

export const PlanRoutes = (
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'PlanService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/plan',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = PlanController(
    scopedServiceFactory,
    openTelemetryCollector
  );

  return router
    .post('/', controller.createPlan)
    .get('/:id', controller.getPlan)
    .put('/', controller.updatePlan)
    .delete('/:id', controller.deletePlan)
    .get('/', controller.listPlans);
};
