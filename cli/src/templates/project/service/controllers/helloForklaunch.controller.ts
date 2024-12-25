import { Controller } from '@forklaunch/core/controllers';
import { get, post } from '@forklaunch/core/http';
import { ConfigInjector, ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaValidator } from '@{{app_name}}/core';
import { configValidator } from '../bootstrapper';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import { HelloForklaunchRequestDtoMapper, HelloForklaunchResponseDtoMapper } from '../models/dtoMapper/helloForklaunch.dtoMapper';

// Controller class that implements the HelloForklaunchService interface 
export class HelloForklaunchController
  implements Controller<HelloForklaunchService>
{
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
      'helloForklaunchService'
    >
  ) {}

  // GET endpoint handler that returns a simple hello message
  helloForklaunchGet = get(
    SchemaValidator(),
    '/',
    {
      name: 'helloForklaunch',
      summary: 'Hello Forklaunch',
      responses: {
        // specifies the success response schema using DtoMapper constructs
        200: HelloForklaunchResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json({
        message: 'Hello Forklaunch'
      });
    }
  );

  // POST endpoint handler that processes request body and returns response from service
  helloForklaunchPost = post(
    SchemaValidator(),
    '/',
    {
      name: 'helloForklaunch', 
      summary: 'Hello Forklaunch',
      // specifies the request body schema using DtoMapper constructs
      body: HelloForklaunchRequestDtoMapper.schema(),
      responses: {
        // specifies the success response schema using DtoMapper constructs
        200: HelloForklaunchResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(
          // constructs a new service instance using the scopeFactory and calls the helloForklaunchPost method
          await this.serviceFactory(
            this.scopeFactory()
          ).helloForklaunchPost(req.body)
        );
    }
  );
}
