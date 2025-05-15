import {
  Body,
  ContractDetailsOrMiddlewareOrTypedHandler,
  ForklaunchExpressLikeRouter,
  ForklaunchRouter,
  HeadersObject,
  MetricsDefinition,
  MiddlewareOrMiddlewareWithTypedHandler,
  MultipartForm,
  OpenTelemetryCollector,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  TypedMiddlewareDefinition,
  UrlEncodedForm
} from '@forklaunch/core/http';
import {
  Router as ExpressRouter,
  MiddlewareHandler,
  MiddlewareNext,
  Request,
  Response
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
    ExpressRouter,
    Request<Record<string, unknown>>,
    Response<Record<string, unknown>>,
    MiddlewareNext
  >
  implements ForklaunchRouter<SV>
{
  constructor(
    public basePath: BasePath,
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>
  ) {
    super(
      basePath,
      schemaValidator,
      new ExpressRouter(),
      openTelemetryCollector
    );

    this.internal.use(polyfillGetHeaders);
    this.internal.use(contentParse);
    this.internal.use(
      enrichResponseTransmission as unknown as MiddlewareHandler
    );
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
    MiddlewareNext
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV> | MultipartForm<SV> | UrlEncodedForm<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    pathOrContractDetailsOrMiddlewareOrTypedHandler:
      | Path
      | ContractDetailsOrMiddlewareOrTypedHandler<
          SV,
          'middleware',
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          Request<Record<string, unknown>>,
          Response<Record<string, unknown>>,
          MiddlewareNext
        >,
    contractDetailsOrMiddlewareOrTypedHandler?: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'middleware',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      Request<Record<string, unknown>>,
      Response<Record<string, unknown>>,
      MiddlewareNext
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'middleware',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      Request<Record<string, unknown>>,
      Response<Record<string, unknown>>,
      MiddlewareNext
    >[]
  ) => {
    return this.registerMiddlewareHandler<
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
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
}
