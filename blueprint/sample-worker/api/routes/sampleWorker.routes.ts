import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { SampleWorkerController } from '../controllers/sampleWorker.controller';

const schemaValidator = SchemaValidator();
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
