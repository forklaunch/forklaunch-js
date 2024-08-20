import {
  ForklaunchExpressLikeRouter,
  ForklaunchRouter
} from '@forklaunch/core/http';
import {
  Router as ExpressRouter,
  MiddlewareHandler
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
import { contentParse } from './middleware/contentParse.middleware';
import { enrichResponseTransmission } from './middleware/enrichResponseTransmission.middleware';
import { polyfillGetHeaders } from './middleware/polyfillGetHeaders.middleware';

export class Router<
    SV extends AnySchemaValidator,
    BasePath extends `/${string}`
  >
  extends ForklaunchExpressLikeRouter<
    SV,
    BasePath,
    MiddlewareHandler,
    ExpressRouter
  >
  implements ForklaunchRouter<SV>
{
  constructor(
    public basePath: BasePath,
    schemaValidator: SV
  ) {
    super(basePath, schemaValidator, new ExpressRouter());

    this.internal.use(polyfillGetHeaders);
    this.internal.use(contentParse);
    this.internal.use(
      enrichResponseTransmission as unknown as MiddlewareHandler
    );
  }
}
