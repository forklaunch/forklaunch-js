import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { SampleWorkerController } from '../controllers/sampleWorker.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const sampleWorkerServiceFactory = ci.scopedResolver(
  tokens.SampleWorkerService
);

export type SampleWorkerServiceFactory = typeof sampleWorkerServiceFactory;

export const sampleWorkerRouter = forklaunchRouter(
  '/sample-worker',
  schemaValidator,
  openTelemetryCollector
);

const controller = SampleWorkerController(
  sampleWorkerServiceFactory,
  openTelemetryCollector
);

sampleWorkerRouter.get('/:id', controller.sampleWorkerGet);
sampleWorkerRouter.post('/', controller.sampleWorkerPost);

export const sampleWorkerSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  sampleWorkerRouter
);
