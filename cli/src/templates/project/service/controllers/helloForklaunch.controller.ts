import { Controller } from '@forklaunch/core/controllers';
import { get, post } from '@forklaunch/core/http';
import { ConfigInjector, ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaValidator } from '@{{app_name}}/core';
import { configValidator } from '../bootstrapper';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import { HelloForklaunchRequestDtoMapper, HelloForklaunchResponseDtoMapper } from '../models/dtoMapper/helloForklaunch.dtoMapper';

export class HelloForklaunchController
  implements Controller<HelloForklaunchService>
{
  constructor(
    private readonly scopeFactory: ConfigInjector<
      SchemaValidator,
      typeof configValidator
    >,
    private serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'helloForklaunchService'
    >
  ) {}

  helloForklaunchGet = get(
    SchemaValidator(),
    '/',
    {
      name: 'helloForklaunch',
      summary: 'Hello Forklaunch',
      responses: {
        200: HelloForklaunchResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json({
        message: 'Hello Forklaunch'
      });
    }
  );

  helloForklaunchPost = post(
    SchemaValidator(),
    '/',
    {
      name: 'helloForklaunch',
      summary: 'Hello Forklaunch',
      body: HelloForklaunchRequestDtoMapper.schema(),
      responses: {
        200: HelloForklaunchResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(
          await this.serviceFactory(
            this.scopeFactory.createScope()
          ).helloForklaunchPost(req.body)
        );
    }
  );
}
