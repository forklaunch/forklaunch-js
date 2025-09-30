import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createPlan,
  deletePlan,
  getPlan,
  listPlans,
  updatePlan
} from '../controllers/plan.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const planRouter = forklaunchRouter(
  '/plan',
  schemaValidator,
  openTelemetryCollector
);

planRouter.post('/', createPlan);
planRouter.get('/', listPlans);
planRouter.get('/:id', getPlan);
planRouter.put('/', updatePlan);
planRouter.delete('/:id', deletePlan);
