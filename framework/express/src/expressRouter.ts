import {
  Body,
  ContractDetailsOrMiddlewareOrTypedHandler,
  ForklaunchExpressLikeRouter,
  HeadersObject,
  MetricsDefinition,
  MiddlewareOrMiddlewareWithTypedHandler,
  OpenTelemetryCollector,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  TypedMiddlewareDefinition
} from '@forklaunch/core/http';
import {
  AnySchemaValidator,
  IdiomaticSchema,
  LiteralSchema,
  SchemaResolve
} from '@forklaunch/validator';
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
import express, {
  Router as ExpressRouter,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express';
import { contentParse } from './middleware/content.parse.middleware';
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
> extends ForklaunchExpressLikeRouter<
  SV,
  BasePath,
  RequestHandler,
  ExpressRouter,
  Request,
  Response,
  NextFunction
> {
  // implements ForklaunchRouter<SV>
  /**
   * Creates an instance of Router.
   *
   * @param {string} basePath - The base path for the router.
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    public basePath: BasePath,
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    options?: OptionsText & OptionsJson & OptionsUrlencoded
  ) {
    super(basePath, schemaValidator, express.Router(), openTelemetryCollector);

    this.internal.use(contentParse<SV>(options));
    this.internal.use(enrichResponseTransmission as unknown as RequestHandler);
  }

  route(path: string): this {
    this.internal.route(path);
    return this;
  }

  param<
    ParamName extends string,
    Types extends {
      req?: LiteralSchema | SV['_SchemaCatchall'];
      res?: IdiomaticSchema<SV>;
    } & {
      [K in ParamName]: IdiomaticSchema<SV>;
    }
  >(
    name: ParamName,
    _types: Types,
    handler: (
      req: SchemaResolve<Types['req']>,
      res: SchemaResolve<Types['res']>,
      next: NextFunction,
      value: SchemaResolve<Types[ParamName]>,
      name: ParamName
    ) => void
  ): this {
    this.internal.param(name, (req, res, next, value, name) => {
      handler(
        req as unknown as SchemaResolve<Types['req']>,
        res as unknown as SchemaResolve<Types['res']>,
        next,
        value,
        name as ParamName
      );
    });

    return this;
  }

  checkout: TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.checkout,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  copy: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.copy,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  lock: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.lock,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  merge: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.merge,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  mkcactivity: TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.mkactivity,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  mkcol: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.mkcol,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  move: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.move,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  'm-search': TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal['m-search'],
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  notify: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.notify,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  propfind: TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.propfind,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  proppatch: TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.proppatch,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  purge: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.purge,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  report: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.report,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  search: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.search,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  subscribe: TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.subscribe,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  unlock: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.unlock,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };

  unsubscribe: TypedMiddlewareDefinition<
    this,
    SV,
    Request,
    Response,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.unsubscribe,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  link: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
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
          Request,
          Response,
          NextFunction
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
      Request,
      Response,
      NextFunction
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
      Request,
      Response,
      NextFunction
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
      this.internal.link,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  unlink: TypedMiddlewareDefinition<this, SV, Request, Response, NextFunction> =
    <
      Path extends `/${string}`,
      P extends ParamsObject<SV>,
      ResBodyMap extends ResponsesObject<SV>,
      ReqBody extends Body<SV>,
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
            Request,
            Response,
            NextFunction
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
        Request,
        Response,
        NextFunction
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
        Request,
        Response,
        NextFunction
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
        this.internal.unlink,
        pathOrContractDetailsOrMiddlewareOrTypedHandler,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      );
    };
}
