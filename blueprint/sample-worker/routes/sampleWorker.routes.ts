import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  ConfigInjector,
  ScopedDependencyFactory
} from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { SampleWorkerController } from '../controllers/sampleWorker.controller';
import { ServiceDependencies } from '../registrations';

// returns an object with the router and the sampleWorkerGet and sampleWorkerPost methods for easy installation
export const SampleWorkerRoutes = (
  scopeFactory: () => ConfigInjector<SchemaValidator, ServiceDependencies>,
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'SampleWorkerService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  // defines the router for the sampleWorker routes
  const router = forklaunchRouter('/sample-worker', openTelemetryCollector);

  const controller = SampleWorkerController(
    scopeFactory,
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    sampleWorkerGet: router.get('/:id', controller.sampleWorkerGet),

    sampleWorkerPost: router.post('/', controller.sampleWorkerPost)
  };
};
