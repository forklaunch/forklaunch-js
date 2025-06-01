import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  ConfigInjector,
  ScopedDependencyFactory
} from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { SampleWorkerController } from '../controllers/sampleWorker.controller';

// returns an object with the router and the sampleWorkerGet and sampleWorkerPost methods for easy installation
export const SampleWorkerRoutes = (
  scopeFactory: () => ConfigInjector<SchemaValidator, SchemaDependencies>,
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'SampleWorkerService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  // defines the router for the sampleWorker routes
  const router = forklaunchRouter(
    '/sample-worker',
    SchemaValidator(),
    openTelemetryCollector
  );

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
