import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { isExpressLikeSchemaHandler } from '../guards/isExpressLikeSchemaHandler';
import { isHttpContractDetails } from '../guards/isHttpContractDetails';
import { isPathParamHttpContractDetails } from '../guards/isPathParamContractDetails';
import { isTypedHandler } from '../guards/isTypedHandler';
import {
  ExpressLikeRouter,
  PathBasedHandler,
  PathOrMiddlewareBasedHandler
} from '../interfaces/expressLikeRouter.interface';
import { parseRequestAuth } from '../middleware/request/auth.middleware';
import { cors } from '../middleware/request/cors.middleware';
import { createContext } from '../middleware/request/createContext.middleware';
import { enrichDetails } from '../middleware/request/enrichDetails.middleware';
import { parse } from '../middleware/request/parse.middleware';
import {
  ExpressLikeHandler,
  ExpressLikeSchemaHandler,
  LiveTypeFunction
} from '../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  HttpContractDetails,
  Method,
  ParamsDictionary,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponseCompiledSchema,
  ResponsesObject
} from '../types/contractDetails.types';
import {
  ContractDetailsOrMiddlewareOrTypedHandler,
  LiveTypeRouteDefinition,
  MiddlewareOrMiddlewareWithTypedHandler,
  TypedMiddlewareDefinition
} from '../types/expressLikeRouter.types';
import { ForklaunchRoute } from '../types/router.types';

/**
 * A class that represents an Express-like router.
 */
export class ForklaunchExpressLikeRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`,
  RouterHandler,
  Internal extends ExpressLikeRouter<RouterHandler, Internal>
> {
  readonly routes: ForklaunchRoute<SV>[] = [];
  readonly basePath: BasePath;

  constructor(
    basePath: BasePath,
    readonly schemaValidator: SV,
    readonly internal: Internal
  ) {
    this.basePath = basePath;

    this.internal.use(createContext(this.schemaValidator) as RouterHandler);
    this.internal.use(cors as RouterHandler);
  }

  /**
   * Resolves middlewares based on the contract details.
   *
   * @param {PathParamHttpContractDetails<SV> | HttpContractDetails<SV>} contractDetails - The contract details.
   * @returns {MiddlewareHandler<SV>[]} - The resolved middlewares.
   */
  #resolveMiddlewares<
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    contractDetails: HttpContractDetails<SV> | PathParamHttpContractDetails<SV>,
    requestSchema: unknown,
    responseSchemas: ResponseCompiledSchema
  ): ExpressLikeSchemaHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  >[] {
    return [
      enrichDetails<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails, requestSchema, responseSchemas),
      parse,
      parseRequestAuth<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >
    ];
  }

  /**
   * Parses and runs the controller handler with error handling.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @template StatusCode - The type of status code.
   * @param {MiddlewareHandler<SV, P, ResBodyMap | string, ReqBody, ReqQuery, LocalsObj, StatusCode>} requestHandler - The request handler.
   * @returns {ExpressMiddlewareHandler} - The Express request handler.
   */
  #parseAndRunControllerHandler<
    P extends ParamsDictionary,
    ResBodyMap extends Record<number, unknown>,
    ReqBody extends Record<string, unknown>,
    ReqQuery extends ParsedQs,
    ReqHeaders extends Record<string, string>,
    ResHeaders extends Record<string, string>,
    LocalsObj extends Record<string, unknown>
  >(
    requestHandler: ExpressLikeHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >
  ): ExpressLikeHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  > {
    return async (req, res, next) => {
      if (!requestHandler) {
        throw new Error('Controller handler is not defined');
      }

      try {
        await requestHandler(req, res, next);
      } catch (error) {
        next?.(error as Error);

        console.error(error);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        }
      }
    };
  }

  /**
   * Extracts the controller handler from the provided handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {MiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The provided handlers.
   * @returns {MiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>} - The extracted controller handler.
   * @throws {Error} - Throws an error if the last argument is not a handler.
   */
  #extractControllerHandler<
    P extends ParamsDictionary,
    ResBodyMap extends Record<number, unknown>,
    ReqBody extends Record<string, unknown>,
    ReqQuery extends ParsedQs,
    ReqHeaders extends Record<string, string>,
    ResHeaders extends Record<string, string>,
    LocalsObj extends Record<string, unknown>
  >(
    handlers: ExpressLikeHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ): ExpressLikeHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  > {
    const controllerHandler = handlers.pop();

    if (typeof controllerHandler !== 'function') {
      throw new Error('Last argument must be a handler');
    }

    return controllerHandler;
  }

  #compile<
    ContractMethod extends Method,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>
  >(
    contractDetails: ContractDetails<
      SV,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders
    >
  ) {
    const schemaValidator = this.schemaValidator as SchemaValidator;

    const requestSchema = schemaValidator.compile(
      schemaValidator.schemify({
        ...(contractDetails.params ? { params: contractDetails.params } : {}),
        ...(contractDetails.requestHeaders
          ? { headers: contractDetails.requestHeaders }
          : {}),
        ...(contractDetails.query ? { query: contractDetails.query } : {}),
        ...(isHttpContractDetails(contractDetails) && contractDetails.body
          ? { body: contractDetails.body }
          : {})
      })
    );

    const responseEntries = {
      400: schemaValidator.string,
      401: schemaValidator.string,
      403: schemaValidator.string,
      404: schemaValidator.string,
      500: schemaValidator.string,
      ...(isPathParamHttpContractDetails(contractDetails) ||
      isHttpContractDetails(contractDetails)
        ? { ...contractDetails.responses }
        : {})
    };

    const responseSchemas: ResponseCompiledSchema = {
      responses: {},
      ...(contractDetails.responseHeaders
        ? {
            headers: schemaValidator.compile(
              schemaValidator.schemify(contractDetails.responseHeaders)
            )
          }
        : {})
    };
    Object.entries(responseEntries).forEach(([code, responseShape]) => {
      responseSchemas.responses[Number(code)] = schemaValidator.compile(
        schemaValidator.schemify(responseShape)
      );
    });

    return {
      requestSchema,
      responseSchemas
    };
  }

  /**
   * Executes request locally, applying parameters
   *
   * @param handlers {ExpressLikeHandler<SV>}
   * @param controllerHandler
   * @returns
   */
  #localParamRequest<Middleware>(
    handlers: Middleware[],
    controllerHandler: Middleware
  ) {
    return async (
      route: string,
      request?: {
        params?: Record<string, string>;
        query?: Record<string, string>;
        headers?: Record<string, string>;
        body?: Record<string, unknown>;
      }
    ) => {
      let statusCode;
      let responseMessage;
      const responseHeaders: Record<string, string> = {};

      const req = {
        params: request?.params ?? {},
        query: request?.query ?? {},
        headers: request?.headers ?? {},
        body: request?.body ?? {},
        path: route
      };

      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        send: (message: string) => {
          responseMessage = message;
        },
        json: (body: Record<string, unknown>) => {
          responseMessage = body;
        },
        jsonp: (body: Record<string, unknown>) => {
          responseMessage = body;
        },
        setHeader: (key: string, value: string) => {
          responseHeaders[key] = value;
        }
      };

      let cursor = handlers.shift() as unknown as (
        req_: typeof req,
        resp_: typeof res,
        next: (err?: Error) => Promise<void> | void
      ) => Promise<void> | void;

      if (cursor) {
        for (const fn of handlers) {
          await cursor(req, res, (err?: Error) => {
            if (err) {
              throw err;
            }

            cursor = fn as unknown as (
              req_: typeof req,
              resp_: typeof res,
              next: (err?: Error) => Promise<void> | void
            ) => Promise<void> | void;
          });
        }
        await cursor(req, res, async (err?: Error) => {
          if (err) {
            throw err;
          }
        });
      }

      const cHandler = controllerHandler as unknown as (
        req_: typeof req,
        resp_: typeof res,
        next: (err?: Error) => Promise<void> | void
      ) => void;
      await cHandler(req, res, (err?: Error) => {
        if (err) {
          throw err;
        }
      });

      return {
        code: statusCode,
        response: responseMessage,
        headers: responseHeaders
      };
    };
  }

  registerRoute<
    ContractMethod extends Method,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    method: ContractMethod,
    path: Path,
    registrationMethod: PathBasedHandler<RouterHandler>,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareAndTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ): LiveTypeFunction<
    SV,
    `${BasePath}${Path}`,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders
  > {
    // in this case, we know that the first argument is the typedHandler. As a result, we only use defined handlers
    if (
      isTypedHandler<
        SV,
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      const { contractDetails, handlers } =
        contractDetailsOrMiddlewareOrTypedHandler;
      return this.registerRoute<
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        method,
        path,
        registrationMethod,
        contractDetails,
        ...handlers
      ) as unknown as LiveTypeFunction<
        SV,
        `${BasePath}${Path}`,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders
      >;
    }
    // in this case, we test for the last element of the handlers. If typed handler, break this down
    else {
      const maybeTypedHandler = middlewareOrMiddlewareAndTypedHandler.pop();
      if (
        isTypedHandler<
          SV,
          ContractMethod,
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj
        >(maybeTypedHandler)
      ) {
        const { contractDetails, handlers } = maybeTypedHandler;
        return this.registerRoute<
          ContractMethod,
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj
        >(
          method,
          path,
          registrationMethod,
          contractDetails,
          ...middlewareOrMiddlewareAndTypedHandler.concat(handlers)
        ) as unknown as LiveTypeFunction<
          SV,
          `${BasePath}${Path}`,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders
        >;
      } else {
        if (
          isExpressLikeSchemaHandler<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj
          >(contractDetailsOrMiddlewareOrTypedHandler) ||
          isTypedHandler<
            SV,
            ContractMethod,
            Path,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj
          >(contractDetailsOrMiddlewareOrTypedHandler)
        ) {
          throw new Error('Contract details are not defined');
        }
        const contractDetails = contractDetailsOrMiddlewareOrTypedHandler;

        const handlers = (
          middlewareOrMiddlewareAndTypedHandler as unknown[]
        ).filter((handler) =>
          isExpressLikeSchemaHandler<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj
          >(handler)
        );

        if (
          !isHttpContractDetails<
            SV,
            Path,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders
          >(contractDetails) &&
          !isPathParamHttpContractDetails<
            SV,
            Path,
            P,
            ResBodyMap,
            ReqQuery,
            ReqHeaders,
            ResHeaders
          >(contractDetails)
        ) {
          throw new Error(
            'Contract details are malformed for route definition'
          );
        }

        this.routes.push({
          basePath: this.basePath,
          path,
          method,
          contractDetails
        });

        const { requestSchema, responseSchemas } = this.#compile<
          ContractMethod,
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders
        >(contractDetails);

        const controllerHandler = this.#extractControllerHandler(handlers);

        registrationMethod.bind(this.internal)(
          path,
          ...(this.#resolveMiddlewares<
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj
          >(contractDetails, requestSchema, responseSchemas).concat(
            handlers
          ) as RouterHandler[]),
          this.#parseAndRunControllerHandler(controllerHandler) as RouterHandler
        );

        return this.#localParamRequest(
          handlers,
          controllerHandler
        ) as LiveTypeFunction<
          SV,
          `${BasePath}${Path}`,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders
        >;
      }
    }
  }

  #extractMiddlewareFromEnrichedTypedHandlerArray<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'middleware',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const lastHandler = middlewareOrMiddlewareWithTypedHandler.pop();
    let rawHandler = [lastHandler];
    if (
      isTypedHandler<
        SV,
        'middleware',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(lastHandler)
    ) {
      rawHandler = lastHandler.handlers;
    }

    return [
      ...(middlewareOrMiddlewareWithTypedHandler as RouterHandler[]),
      ...(rawHandler as RouterHandler[])
    ];
  }

  #extractMiddlewareAsRouterHandlers<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    contractDetailsOrMiddlewareOrTypedHandler:
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
          LocalsObj
        >
      | undefined,
    middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'middleware',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const middleware: RouterHandler[] = [];

    if (
      isTypedHandler<
        SV,
        'middleware',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      middleware.push(
        ...(contractDetailsOrMiddlewareOrTypedHandler.handlers as RouterHandler[])
      );
    } else if (
      isExpressLikeSchemaHandler(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      middleware.push(
        contractDetailsOrMiddlewareOrTypedHandler as RouterHandler
      );
    }

    middleware.push(
      ...this.#extractMiddlewareFromEnrichedTypedHandlerArray<
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(middlewareOrMiddlewareWithTypedHandler)
    );

    return middleware;
  }

  registerMiddlewareHandler<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    registrationMethod: PathOrMiddlewareBasedHandler<RouterHandler>,
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
          LocalsObj
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
      LocalsObj
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
      LocalsObj
    >[]
  ): this {
    const middleware: RouterHandler[] = [];

    if (typeof pathOrContractDetailsOrMiddlewareOrTypedHandler === 'string') {
      middleware.push(
        ...this.#extractMiddlewareAsRouterHandlers<
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj
        >(
          contractDetailsOrMiddlewareOrTypedHandler,
          middlewareOrMiddlewareWithTypedHandler
        )
      );
      const path = pathOrContractDetailsOrMiddlewareOrTypedHandler;
      registrationMethod.bind(this.internal)(path, ...middleware);
    } else {
      middleware.push(
        ...this.#extractMiddlewareAsRouterHandlers<
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj
        >(
          pathOrContractDetailsOrMiddlewareOrTypedHandler,
          (isExpressLikeSchemaHandler<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj
          >(contractDetailsOrMiddlewareOrTypedHandler) ||
          isTypedHandler<
            SV,
            'middleware',
            Path,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj
          >(contractDetailsOrMiddlewareOrTypedHandler)
            ? [contractDetailsOrMiddlewareOrTypedHandler]
            : []
          ).concat(middlewareOrMiddlewareWithTypedHandler)
        )
      );
      registrationMethod.bind(this.internal)(...middleware);
    }
    return this;
  }

  use: TypedMiddlewareDefinition<this, SV> = <
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
          LocalsObj
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
      LocalsObj
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
      LocalsObj
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
      this.internal.use,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  all: TypedMiddlewareDefinition<this, SV> = <
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
          LocalsObj
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
      LocalsObj
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
      LocalsObj
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
      this.internal.all,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  connect: TypedMiddlewareDefinition<this, SV> = <
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
          LocalsObj
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
      LocalsObj
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
      LocalsObj
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
      this.internal.connect,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  /**
   * Registers a GET route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  get: LiveTypeRouteDefinition<SV, BasePath, 'get'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'get',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'get',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      get: this.registerRoute<
        'get',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'get',
        path,
        this.internal.get,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a POST route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Expxwress router.
   */
  post: LiveTypeRouteDefinition<SV, BasePath, 'post'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'post',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'post',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      post: this.registerRoute<
        'post',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'post',
        path,
        this.internal.post,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a PUT route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  put: LiveTypeRouteDefinition<SV, BasePath, 'put'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'put',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'put',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      put: this.registerRoute<
        'put',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'put',
        path,
        this.internal.put,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a PATCH route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  patch: LiveTypeRouteDefinition<SV, BasePath, 'patch'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'patch',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'patch',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      patch: this.registerRoute<
        'patch',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'patch',
        path,
        this.internal.patch,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a DELETE route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  delete: LiveTypeRouteDefinition<SV, BasePath, 'delete'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'delete',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'delete',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      delete: this.registerRoute<
        'delete',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'delete',
        path,
        this.internal.delete,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a OPTIONS route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  options: LiveTypeRouteDefinition<SV, BasePath, 'options'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'options',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'options',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      options: this.registerRoute<
        'options',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'options',
        path,
        this.internal.options,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a HEAD route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  head: LiveTypeRouteDefinition<SV, BasePath, 'head'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'head',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'head',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      head: this.registerRoute<
        'head',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'head',
        path,
        this.internal.head,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };

  /**
   * Registers a TRACE route with the specified contract details and handler handlers.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} handlers - The handler handlers.
   * @returns {ExpressRouter} - The Express router.
   */
  trace: LiveTypeRouteDefinition<SV, BasePath, 'trace'> = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetailsOrMiddlewareOrTypedHandler: ContractDetailsOrMiddlewareOrTypedHandler<
      SV,
      'trace',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >,
    ...middlewareOrMiddlewareWithTypedHandler: MiddlewareOrMiddlewareWithTypedHandler<
      SV,
      'trace',
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) => {
    return {
      trace: this.registerRoute<
        'trace',
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(
        'trace',
        path,
        this.internal.trace,
        contractDetailsOrMiddlewareOrTypedHandler,
        ...middlewareOrMiddlewareWithTypedHandler
      )
    };
  };
}
