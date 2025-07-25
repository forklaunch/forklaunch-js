import { handlers, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  ConfigInjector,
  ScopedDependencyFactory
} from '@forklaunch/core/services';
import { SampleWorkerService } from '../../domain/interfaces/sampleWorkerService.interface';
import {
  SampleWorkerRequestMapper,
  SampleWorkerResponseMapper
} from '../../domain/mappers/sampleWorker.mappers';
import { SchemaDependencies } from '../../registrations';

// Controller class that implements the SampleWorkerService interface
export const SampleWorkerController = (
  // scopeFactory returns new scopes that can be used for joint transactions
  scopeFactory: () => ConfigInjector<SchemaValidator, SchemaDependencies>,
  // serviceFactory returns a new service instance on demand
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'SampleWorkerService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    // GET endpoint handler that returns a simple message
    sampleWorkerGet: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'sampleWorker',
        summary: 'SampleWorker',
        params: {
          id: 'string'
        },
        responses: {
          // specifies the success response schema using Mapper constructs
          200: SampleWorkerResponseMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('SampleWorkerGet', req.params);
        res.status(200).json({
          message: 'SampleWorker',
          processed: false,
          retryCount: 0
        });
      }
    ),

    // POST endpoint handler that processes request body and returns response from service
    sampleWorkerPost: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'sampleWorker',
        summary: 'SampleWorker',
        // specifies the request body schema using Mapper constructs
        body: SampleWorkerRequestMapper.schema(),
        responses: {
          // specifies the success response schema using Mapper constructs
          200: SampleWorkerResponseMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('SampleWorkerPost', req.body);
        res.status(200).json(
          // constructs a new service instance using the scopeFactory and calls the sampleWorkerPost method
          await serviceFactory(scopeFactory()).sampleWorkerPost(req.body)
        );
      }
    )
  }) satisfies Controller<SampleWorkerService>;
