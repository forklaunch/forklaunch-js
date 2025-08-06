import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { PlanController } from '../controllers/plan.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const planServiceFactory = ci.scopedResolver(tokens.PlanService);

export type PlanServiceFactory = typeof planServiceFactory;

export const planRouter = forklaunchRouter(
  '/plan',
  schemaValidator,
  openTelemetryCollector
);
const controller = PlanController(planServiceFactory, openTelemetryCollector);

planRouter.post('/', controller.createPlan);
planRouter.get('/:id', controller.getPlan);
planRouter.put('/', controller.updatePlan);
planRouter.delete('/:id', controller.deletePlan);
planRouter.get('/', controller.listPlans);

export const planSdkRouter = sdkRouter(schemaValidator, controller, planRouter);
