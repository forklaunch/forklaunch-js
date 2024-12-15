import { Controller } from '@forklaunch/core/controllers';
import { post } from '@forklaunch/core/http';
import { SchemaValidator } from '@{{app_name}}/core';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import { HelloForklaunchRequestDtoMapper, HelloForklaunchResponseDtoMapper } from '../models/dtoMapper/helloForklaunch.dtoMapper';
import { ConfigInjector } from '@forklaunch/core/services';

export class HelloForklaunchController
  implements Controller<HelloForklaunchService>
{
  constructor(
    private readonly scopeFactory: ConfigInjector<
      SchemaValidator,
      typeof configValidator
    >,
    private serviceFactory: (
      scope?: ConfigInjector<SchemaValidator, typeof configValidator>
    ) => HelloForklaunchService
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
