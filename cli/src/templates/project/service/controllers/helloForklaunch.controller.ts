import { Controller } from '@forklaunch/core/controllers';
import { post } from '@forklaunch/core/http';
import { SchemaValidator } from '@{{app_name}}/core';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import { HelloForklaunchRequestDtoMapper, HelloForklaunchResponseDtoMapper } from '../models/dtoMapper/helloForklaunch.dtoMapper';

export class HelloForklaunchController<ConfigInjectorScope>
  implements Controller<HelloForklaunchService>
{
  constructor(
    private readonly service: (
      scope?: ConfigInjectorScope
    ) => HelloForklaunchService
  ) {}

  helloForklaunch = post(
    SchemaValidator(),
    '/hello',
    {
      name: 'helloForklaunch',
      summary: 'Hello Forklaunch',
      body: HelloForklaunchRequestDtoMapper.schema(),
      responses: {
        200: HelloForklaunchResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.service().helloForklaunch(req.body));
    }
  );
}
