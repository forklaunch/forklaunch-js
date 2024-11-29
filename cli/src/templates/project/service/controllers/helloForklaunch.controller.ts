import { Controller } from '@forklaunch/core/controllers';
import { get } from '@forklaunch/core/http';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import { HelloForklaunchResponseDtoMapper } from '../models/dtoMapper/helloForklaunch.dtoMapper';

export class HelloForklaunchController<ConfigInjectorScope>
  implements Controller<HelloForklaunchService>
{
  constructor(
    private readonly service: (
      scope?: ConfigInjectorScope
    ) => HelloForklaunchService
  ) {}

  helloForklaunch = get(
    '/hello',
    {
      name: 'helloForklaunch',
      summary: 'Hello Forklaunch',
      responses: {
        200: HelloForklaunchResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.service().helloForklaunch(req.body));
    }
  );
}
