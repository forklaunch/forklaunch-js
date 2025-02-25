import { Controller } from '@forklaunch/core/controllers';
import { get, post } from '@forklaunch/core/http';
import {
  ConfigInjector,
  ScopedDependencyFactory
} from '@forklaunch/core/services';
import { SchemaValidator } from '@forklaunch/framework-core';
import { configValidator } from '../bootstrapper';
import { SampleWorkerService } from '../interfaces/sampleWorker.interface';
import {
  SampleWorkerRequestDtoMapper,
  SampleWorkerResponseDtoMapper
} from '../models/dtoMapper/sampleWorker.dtoMapper';

// Controller class that implements the SampleWorkerService interface
export class SampleWorkerController implements Controller<SampleWorkerService> {
  constructor(
    // scopeFactory returns new scopes that can be used for joint transactions
    private readonly scopeFactory: () => ConfigInjector<
      SchemaValidator,
      typeof configValidator
    >,
    // serviceFactory returns a new service instance on demand
    private serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'sampleWorkerService'
    >
  ) {}

  // GET endpoint handler that returns a simple message
  sampleWorkerGet = get(
    SchemaValidator(),
    '/',
    {
      name: 'sampleWorker',
      summary: 'SampleWorker',
      responses: {
        // specifies the success response schema using DtoMapper constructs
        200: SampleWorkerResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json({
        message: 'SampleWorker',
        processed: false,
        retryCount: 0
      });
    }
  );

  // POST endpoint handler that processes request body and returns response from service
  sampleWorkerPost = post(
    SchemaValidator(),
    '/',
    {
      name: 'sampleWorker',
      summary: 'SampleWorker',
      // specifies the request body schema using DtoMapper constructs
      body: SampleWorkerRequestDtoMapper.schema(),
      responses: {
        // specifies the success response schema using DtoMapper constructs
        200: SampleWorkerResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(
        // constructs a new service instance using the scopeFactory and calls the sampleWorkerPost method
        await this.serviceFactory(this.scopeFactory()).sampleWorkerPost(
          req.body
        )
      );
    }
  );
}
