import {
  ForklaunchExpressLikeRouter,
  ForklaunchRouter
} from '@forklaunch/core/http';
import {
  AnySchemaValidator,
  IdiomaticSchema,
  LiteralSchema,
  SchemaResolve
} from '@forklaunch/validator';
import express, {
  Router as ExpressRouter,
  NextFunction,
  RequestHandler
} from 'express';
import { enrichResponseTransmission } from './middleware/response.middleware';

/**
 * Router class that sets up routes and middleware for an Express router.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @implements {ForklaunchRouter<SV>}
 */
export class Router<
    SV extends AnySchemaValidator,
    BasePath extends `/${string}`
  >
  extends ForklaunchExpressLikeRouter<
    SV,
    BasePath,
    RequestHandler,
    ExpressRouter
  >
  implements ForklaunchRouter<SV>
{
  /**
   * Creates an instance of Router.
   *
   * @param {string} basePath - The base path for the router.
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    public basePath: BasePath,
    schemaValidator: SV
  ) {
    super(basePath, schemaValidator, express.Router());

    this.internal.use(express.json());
    this.internal.use(enrichResponseTransmission as unknown as RequestHandler);
  }

  route(path: string): this {
    this.internal.route(path);
    return this;
  }

  param<ParamName extends string>(
    types: {
      req?: LiteralSchema | SV['_SchemaCatchall'];
      res?: IdiomaticSchema<SV>;
    } & {
      [K in ParamName]: IdiomaticSchema<SV>;
    },
    callback: (
      name: ParamName,
      matcher: RegExp
    ) => (
      req: SchemaResolve<typeof types.req>,
      res: SchemaResolve<typeof types.res>,
      next: NextFunction,
      value: SchemaResolve<(typeof types)[ParamName]>,
      name: ParamName
    ) => void
  ): this;
  param<ParamName extends string>(
    name: ParamName,
    types: {
      req?: LiteralSchema | SV['_SchemaCatchall'];
      res?: IdiomaticSchema<SV>;
    } & {
      [K in ParamName]: IdiomaticSchema<SV>;
    },
    handler: (
      req: SchemaResolve<typeof types.req>,
      res: SchemaResolve<typeof types.res>,
      next: NextFunction,
      value: SchemaResolve<(typeof types)[ParamName]>,
      name: ParamName
    ) => void
  ): this;
  params<ParamName extends string>() {
    this.internal.param(name, (req, res, next, value, name) => {
      handler(
        req as unknown as SchemaResolve<typeof type.req>,
        res as unknown as SchemaResolve<typeof type.res>,
        next,
        value as unknown as SchemaResolve<(typeof type)[ParamName]>,
        name as ParamName
      );
    });
    return this;
  }

  checkout: LiveTypeRouteDefinition;
}
