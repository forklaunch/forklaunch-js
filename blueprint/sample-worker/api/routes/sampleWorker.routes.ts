import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  sampleWorkerGet,
  sampleWorkerPost
} from '../controllers/sampleWorker.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const sampleWorkerRouter = forklaunchRouter(
  '/sample-worker',
  schemaValidator,
  openTelemetryCollector
);

sampleWorkerRouter.get('/:id', sampleWorkerGet);
sampleWorkerRouter.post('/', sampleWorkerPost);
