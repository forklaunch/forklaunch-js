import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';

import { RemoveTrailingSlash } from '@forklaunch/common';
import { isConstrainedForklaunchRouter } from '../guards/isConstrainedForklaunchRouter';
import { isExpressLikeSchemaHandler } from '../guards/isExpressLikeSchemaHandler';
import { isForklaunchExpressLikeRouter } from '../guards/isForklaunchExpressLikeRouter';
import { isForklaunchRouter } from '../guards/isForklaunchRouter';
import { isHttpContractDetails } from '../guards/isHttpContractDetails';
import { isPathParamHttpContractDetails } from '../guards/isPathParamContractDetails';
import { isTypedHandler } from '../guards/isTypedHandler';
import {
  ExpressLikeRouter,
  NestableRouterBasedHandler,
  PathBasedHandler,
  PathOrMiddlewareBasedHandler
} from '../interfaces/expressLikeRouter.interface';
import { parseRequestAuth } from '../middleware/request/auth.middleware';
import { enrichDetails } from '../middleware/request/enrichDetails.middleware';
import { parse } from '../middleware/request/parse.middleware';
import { OpenTelemetryCollector } from '../telemetry/openTelemetryCollector';
import {
  ExpressLikeHandler,
  ExpressLikeSchemaHandler,
  LiveTypeFunction
} from '../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
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
  TypedMiddlewareDefinition,
  TypedNestableMiddlewareDefinition
} from '../types/expressLikeRouter.types';
import { MetricsDefinition } from '../types/openTelemetryCollector.types';
import {
  ConstrainedForklaunchRouter,
  ForklaunchRoute,
  ForklaunchRouter
} from '../types/router.types';
import {
  discriminateBody,
  discriminateResponseBodies
} from './discriminateBody';

/**
 * A class that represents an Express-like router.
 */
export class ForklaunchExpressLikeRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`,
  RouterHandler,
  Internal extends ExpressLikeRouter<RouterHandler, Internal>,
  BaseRequest,
  BaseResponse,
  NextFunction
> implements ConstrainedForklaunchRouter<SV, RouterHandler>
{
  requestHandler!: RouterHandler;
  routers: ForklaunchRouter<SV>[] = [];
  readonly routes: ForklaunchRoute<SV>[] = [];
  readonly basePath: BasePath;

  constructor(
    basePath: BasePath,
    readonly schemaValidator: SV,
    readonly internal: Internal,
    readonly postEnrichMiddleware: RouterHandler[],
    readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>
  ) {
    this.basePath = basePath;
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
    path: string,
    contractDetails: PathParamHttpContractDetails<SV>,
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
    LocalsObj,
    BaseRequest,
    BaseResponse,
    NextFunction
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
      >(
        `${this.basePath}${path}`,
        contractDetails as PathParamHttpContractDetails<SV>,
        requestSchema,
        responseSchemas,
        this.openTelemetryCollector
      ),
      ...this.postEnrichMiddleware,
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
    ] as ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >[];
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >
  ): ExpressLikeHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    BaseRequest,
    BaseResponse,
    NextFunction
  > {
    return async (req, res, next) => {
      if (!requestHandler) {
        throw new Error('Controller handler is not defined');
      }

      try {
        await requestHandler(req, res, next);
      } catch (error) {
        if (next && typeof next === 'function') {
          next(error as Error);
        } else {
          throw error;
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >[]
  ): ExpressLikeHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    BaseRequest,
    BaseResponse,
    NextFunction
  > {
    const controllerHandler = handlers.pop();

    if (typeof controllerHandler !== 'function') {
      throw new Error(
        `Last argument must be a handler, received: ${controllerHandler}`
      );
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
      ResHeaders,
      BaseRequest
    >
  ) {
    const schemaValidator = this.schemaValidator as SchemaValidator;

    let body = null;
    if (
      isHttpContractDetails<
        SV,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        BaseRequest
      >(contractDetails)
    ) {
      body = discriminateBody(this.schemaValidator, contractDetails.body);
    }

    const requestSchema = schemaValidator.compile(
      schemaValidator.schemify({
        ...(contractDetails.params ? { params: contractDetails.params } : {}),
        ...(contractDetails.requestHeaders
          ? { headers: contractDetails.requestHeaders }
          : {}),
        ...(contractDetails.query ? { query: contractDetails.query } : {}),
        ...(body != null ? { body: body.schema } : {})
      })
    );

    const responseEntries = {
      400: schemaValidator.string,
      401: schemaValidator.string,
      403: schemaValidator.string,
      404: schemaValidator.string,
      500: schemaValidator.string,
      ...(isPathParamHttpContractDetails<
        SV,
        Path,
        P,
        ResBodyMap,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        BaseRequest
      >(contractDetails) ||
      isHttpContractDetails<
        SV,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        BaseRequest
      >(contractDetails)
        ? Object.fromEntries(
            Object.entries(
              discriminateResponseBodies(
                this.schemaValidator,
                contractDetails.responses
              )
            ).map(([key, value]) => {
              return [key, value.schema];
            })
          )
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
  #localParamRequest<Middleware, Route extends string>(
    handlers: Middleware[],
    controllerHandler: Middleware
  ) {
    return async (
      route: RemoveTrailingSlash<Route>,
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
        body:
          discriminateBody(this.schemaValidator, request?.body)?.schema ?? {},
        path: route
      };

      function remapFileBody(body: Record<string, unknown> | File) {
        if (body instanceof File) {
          return (name: string, contentType: string) => {
            return new File([body], name, { type: contentType });
          };
        }
        Object.entries(body).forEach(([key, value]) => {
          if (value instanceof File) {
            body[key] = (name: string, contentType: string) => {
              return new File([value], name, { type: contentType });
            };
          } else if (typeof value === 'object') {
            body[key] = remapFileBody(value as Record<string, unknown>);
          }
        });
        return body;
      }

      req.body = remapFileBody(req.body);

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
        },
        sseEmitter: (
          generator: () => AsyncGenerator<Record<string, unknown>>
        ) => {
          responseMessage = generator();
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
        code: Number(statusCode),
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
        LocalsObj,
        BaseRequest,
        BaseResponse,
        NextFunction
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
      const maybeTypedHandler =
        middlewareOrMiddlewareAndTypedHandler[
          middlewareOrMiddlewareAndTypedHandler.length - 1
        ];
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
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
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
            ResHeaders,
            BaseRequest
          >(contractDetails) &&
          !isPathParamHttpContractDetails<
            SV,
            Path,
            P,
            ResBodyMap,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            BaseRequest
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
          contractDetails: contractDetails as PathParamHttpContractDetails<SV>
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
          >(
            path,
            contractDetails as PathParamHttpContractDetails<SV>,
            requestSchema,
            responseSchemas
          ).concat(handlers) as RouterHandler[]),
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

  #extractHandlers<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    ArrayReturnType
  >(
    handlers: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[],
    processMiddleware?: (handler: unknown) => RouterHandler | Internal
  ) {
    const last = handlers.pop();
    let finalHandlers = last ? [last] : [];
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
        LocalsObj,
        BaseRequest,
        BaseResponse,
        NextFunction
      >(last)
    ) {
      finalHandlers = last.handlers;
    }

    handlers.forEach((handler) => {
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
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >(handler)
      ) {
        throw new Error(
          'Only the last argument supplied to this function can be a typed handler. Please use only middleware.'
        );
      }
    });

    const middleware = processMiddleware
      ? handlers.map(processMiddleware)
      : (handlers as ArrayReturnType[]);

    return [...middleware, ...finalHandlers] as ArrayReturnType[];
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
    handlers: MiddlewareOrMiddlewareWithTypedHandler<
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
      BaseRequest,
      BaseResponse,
      NextFunction
    >[]
  ) {
    return this.#extractHandlers<
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      RouterHandler
    >(handlers);
  }

  #extractNestableMiddlewareFromEnrichedTypedHandlerArray<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    handlers: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ) {
    return this.#extractHandlers<
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      RouterHandler | Internal
    >(handlers, (handler) =>
      isForklaunchExpressLikeRouter<
        SV,
        Path,
        RouterHandler,
        Internal,
        BaseRequest,
        BaseResponse,
        NextFunction
      >(handler)
        ? handler.internal
        : (handler as RouterHandler)
    );
  }

  #processTypedHandlerOrMiddleware<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    handler:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | undefined,
    middleware: RouterHandler[]
  ) {
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
        LocalsObj,
        BaseRequest,
        BaseResponse,
        NextFunction
      >(handler)
    ) {
      middleware.push(...(handler.handlers as RouterHandler[]));
    } else if (isExpressLikeSchemaHandler(handler)) {
      middleware.push(handler as RouterHandler);
    }
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
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >[]
  ) {
    const middleware: RouterHandler[] = [];

    this.#processTypedHandlerOrMiddleware<
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >(contractDetailsOrMiddlewareOrTypedHandler, middleware);

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

  #extractNestableMiddlewareAsRouterHandlers<
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
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
      | undefined,
    middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ) {
    const middleware: (RouterHandler | Internal)[] = [];

    this.#processTypedHandlerOrMiddleware<
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >(
      contractDetailsOrMiddlewareOrTypedHandler as ContractDetailsOrMiddlewareOrTypedHandler<
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
        BaseRequest,
        BaseResponse,
        NextFunction
      >,
      middleware as RouterHandler[]
    );

    if (
      isForklaunchExpressLikeRouter<
        SV,
        Path,
        RouterHandler,
        Internal,
        BaseRequest,
        BaseResponse,
        NextFunction
      >(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      middleware.push(contractDetailsOrMiddlewareOrTypedHandler.internal);
    }

    middleware.push(
      ...this.#extractNestableMiddlewareFromEnrichedTypedHandlerArray<
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
          LocalsObj,
          BaseRequest,
          BaseResponse,
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
      BaseRequest,
      BaseResponse,
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
      BaseRequest,
      BaseResponse,
      NextFunction
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
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

  registerNestableMiddlewareHandler<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    registrationMethod: NestableRouterBasedHandler<RouterHandler, Internal>,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ): this {
    const middleware: (RouterHandler | Internal)[] = [];
    let path: `/${string}` | undefined;

    if (typeof pathOrContractDetailsOrMiddlewareOrTypedHandler === 'string') {
      middleware.push(
        ...this.#extractNestableMiddlewareAsRouterHandlers<
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
      path = pathOrContractDetailsOrMiddlewareOrTypedHandler;
    } else {
      if (
        isConstrainedForklaunchRouter<SV, RouterHandler>(
          pathOrContractDetailsOrMiddlewareOrTypedHandler
        )
      ) {
        path = pathOrContractDetailsOrMiddlewareOrTypedHandler.basePath;
      }
      middleware.push(
        ...this.#extractNestableMiddlewareAsRouterHandlers<
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
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
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
          >(contractDetailsOrMiddlewareOrTypedHandler) ||
          isConstrainedForklaunchRouter<SV, RouterHandler>(
            contractDetailsOrMiddlewareOrTypedHandler
          )
            ? [contractDetailsOrMiddlewareOrTypedHandler]
            : []
          ).concat(middlewareOrMiddlewareWithTypedHandler)
        )
      );
    }

    if (path) {
      registrationMethod.bind(this.internal)(path, ...middleware);
    } else {
      registrationMethod.bind(this.internal)(...middleware);
    }
    return this;
  }

  use: TypedNestableMiddlewareDefinition<
    this,
    RouterHandler,
    Internal,
    SV,
    BaseRequest,
    BaseResponse,
    NextFunction
  > = <
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    Subpath extends `/${string}`,
    Router extends ForklaunchExpressLikeRouter<
      SV,
      Subpath,
      RouterHandler,
      Internal,
      BaseRequest,
      BaseResponse,
      NextFunction
    >
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router
    )[]
  ) => {
    [
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    ].forEach((arg) => {
      if (isForklaunchRouter<SV>(arg)) {
        this.routers.push(arg);
      }
    });

    return this.registerNestableMiddlewareHandler<
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

  all: TypedMiddlewareDefinition<
    this,
    SV,
    BaseRequest,
    BaseResponse,
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
          BaseRequest,
          BaseResponse,
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
      BaseRequest,
      BaseResponse,
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
      BaseRequest,
      BaseResponse,
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
      this.internal.all,
      pathOrContractDetailsOrMiddlewareOrTypedHandler,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  connect: TypedMiddlewareDefinition<
    this,
    SV,
    BaseRequest,
    BaseResponse,
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
          BaseRequest,
          BaseResponse,
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
      BaseRequest,
      BaseResponse,
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
      BaseRequest,
      BaseResponse,
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
  get: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'get',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  post: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'post',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  put: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'put',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  patch: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'patch',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  delete: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'delete',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  options: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'options',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  head: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'head',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
  trace: LiveTypeRouteDefinition<
    SV,
    BasePath,
    'trace',
    BaseRequest,
    BaseResponse,
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
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
