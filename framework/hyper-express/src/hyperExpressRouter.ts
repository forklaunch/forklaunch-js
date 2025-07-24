import {
  Body,
  ContractDetailsOrMiddlewareOrTypedHandler,
  ForklaunchExpressLikeRouter,
  ForklaunchRouter,
  HeadersObject,
  MetricsDefinition,
  MiddlewareOrMiddlewareWithTypedHandler,
  OpenTelemetryCollector,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods,
  TypedMiddlewareDefinition,
  VersionSchema
} from '@forklaunch/core/http';
import {
  Router as ExpressRouter,
  MiddlewareHandler,
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';

import { BusboyConfig } from 'busboy';
import { contentParse } from './middleware/contentParse.middleware';
import { enrichResponseTransmission } from './middleware/enrichResponseTransmission.middleware';
import { polyfillGetHeaders } from './middleware/polyfillGetHeaders.middleware';
import { ExpressRequestHandler } from './types/hyperExpress.types';

export class Router<
    SV extends AnySchemaValidator,
    BasePath extends `/${string}`
  >
  extends ForklaunchExpressLikeRouter<
    SV,
    BasePath,
    MiddlewareHandler,
    ExpressRouter,
    Request<Record<string, unknown>>,
    Response<Record<string, unknown>>,
    MiddlewareNext
  >
  implements ForklaunchRouter<SV>
{
  private configOptions;

  constructor(
    public basePath: BasePath,
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    options?: {
      busboy?: BusboyConfig;
    }
  ) {
    super(
      basePath,
      schemaValidator,
      new ExpressRouter(),
      [
        contentParse<SV>(options),
        enrichResponseTransmission as unknown as MiddlewareHandler
      ],
      openTelemetryCollector
    );

    this.configOptions = options;

    this.internal.use(polyfillGetHeaders);
  }

  route(path: string): this {
    this.internal.route(path);
    return this;
  }

  any: TypedMiddlewareDefinition<
    this,
    SV,
    Request<Record<string, unknown>>,
    Response<Record<string, unknown>>,
    MiddlewareNext,
    ExpressRequestHandler
  > = <
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      Request<Record<string, unknown>>
    >
  >(
    pathOrContractDetailsOrMiddlewareOrTypedHandler:
      | Path
      | ContractDetailsOrMiddlewareOrTypedHandler<
          SV,
          Name,
          'middleware',
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          VersionedApi,
          Request<Record<string, unknown>>,
          Response<Record<string, unknown>>,
          MiddlewareNext,
          Auth
        >,
    contractDetailsOrMiddlewareOrTypedHandler?: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      Name,
      'middleware',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      Request<Record<string, unknown>>,
      Response<Record<string, unknown>>,
      MiddlewareNext,
      Auth
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      Name,
      'middleware',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      Request<Record<string, unknown>>,
      Response<Record<string, unknown>>,
      MiddlewareNext,
      Auth
    >[]
  ) => {
    return this.registerMiddlewareHandler<
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      Auth
    >(
      this.internal.any,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  // TODO: Implement the rest of the methods
  // upgrade
  // ws

  clone(): this {
    const clone = new Router<SV, BasePath>(
      this.basePath,
      this.schemaValidator,
      this.openTelemetryCollector,
      this.configOptions
    ) as this;

    this.cloneInternals(clone);

    return clone;
  }
}
