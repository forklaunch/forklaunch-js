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
  serviceFactory: ScopedDependencyFactory<
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
    serviceFactory,
    openTelemetryCollector
  );

  return router
    .get('/:id', controller.sampleWorkerGet)
    .post('/', controller.sampleWorkerPost);
};
