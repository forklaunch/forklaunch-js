import { forklaunchRouter } from '@forklaunch/framework-core';
import { SampleWorkerController } from '../controllers/sampleWorker.controller';

// defines the router for the sampleWorker routes
export const router = forklaunchRouter('/sample-worker');

// returns an object with the router and the sampleWorkerGet and sampleWorkerPost methods for easy installation
export const SampleWorkerRoutes = (controller: SampleWorkerController) => ({
  router,

  sampleWorkerGet: router.get('/', controller.sampleWorkerGet),
  sampleWorkerPost: router.post('/', controller.sampleWorkerPost)
});
