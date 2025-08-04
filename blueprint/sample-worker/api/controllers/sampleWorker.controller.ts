import { handlers, schemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { SampleWorkerService } from '../../domain/interfaces/sampleWorkerService.interface';
import {
  SampleWorkerRequestMapper,
  SampleWorkerResponseMapper
} from '../../domain/mappers/sampleWorker.mappers';
import { SampleWorkerServiceFactory } from '../routes/sampleWorker.routes';

// Controller class that implements the SampleWorkerService interface
export const SampleWorkerController = (
  // serviceFactory returns a new service instance on demand
  serviceFactory: SampleWorkerServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    // GET endpoint handler that returns a simple message
    sampleWorkerGet: handlers.get(
      schemaValidator,
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
      schemaValidator,
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
          // constructs a new service instance and calls the sampleWorkerPost method
          await serviceFactory().sampleWorkerPost(req.body)
        );
      }
    )
  }) satisfies Controller<SampleWorkerService>;
