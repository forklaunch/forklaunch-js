import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';

import {
  Prettify,
  PrettyCamelCase,
  sanitizePathSlashes,
  SanitizePathSlashes,
  toPrettyCamelCase,
  TypeSafeFunction
} from '@forklaunch/common';
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
import { createContext } from '../middleware/request/createContext.middleware';
import { enrichDetails } from '../middleware/request/enrichDetails.middleware';
import { parse } from '../middleware/request/parse.middleware';
import { OpenTelemetryCollector } from '../telemetry/openTelemetryCollector';
import {
  ExpressLikeHandler,
  ExpressLikeSchemaHandler,
  LiveSdkFunction,
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
  NextFunction,
  FetchMap extends Record<never, never> = Record<never, never>,
  Sdk extends Record<never, never> = Record<never, never>,
  SdkName extends string = PrettyCamelCase<BasePath>
> implements ConstrainedForklaunchRouter<SV, RouterHandler>
{
  requestHandler!: RouterHandler;
  routers: ForklaunchRouter<SV>[] = [];
  readonly routes: ForklaunchRoute<SV>[] = [];
  readonly basePath: BasePath;

  fetchMap: FetchMap = {} as FetchMap;
  sdk: Sdk = {} as Sdk;

  constructor(
    basePath: BasePath,
    readonly schemaValidator: SV,
    readonly internal: Internal,
    readonly postEnrichMiddleware: RouterHandler[],
    readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    readonly sdkName?: SdkName
  ) {
    this.basePath = basePath;

    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      process.on('uncaughtException', (err) => {
        this.openTelemetryCollector.error(`Uncaught exception: ${err}`);
        process.exit(1);
      });
      process.on('unhandledRejection', (reason) => {
        this.openTelemetryCollector.error(`Unhandled rejection: ${reason}`);
        process.exit(1);
      });

      process.on('exit', () => {
        this.openTelemetryCollector.info('Shutting down application');
      });
      process.on('SIGINT', () => {
        this.openTelemetryCollector.info('Shutting down application');
        process.exit(0);
      });
    }

    this.internal.use(createContext(this.schemaValidator) as RouterHandler);
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
    Name extends string,
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
      Name,
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
        Name,
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
        Name,
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
        Name,
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
   * Fetches a route from the route map and executes it with the given parameters.
   *
   * @template Path - The path type that extends keyof fetchMap and string.
   * @param {Path} path - The route path
   * @param {Parameters<fetchMap[Path]>[1]} [requestInit] - Optional request initialization parameters.
   * @returns {Promise<ReturnType<fetchMap[Path]>>} - The result of executing the route handler.
   */
  async fetch<Path extends keyof this['fetchMap']>(
    path: Path,
    ...reqInit: this['fetchMap'][Path] extends TypeSafeFunction
      ? Parameters<this['fetchMap'][Path]>[1] extends
          | {
              body: unknown;
            }
          | { query: unknown }
          | { params: unknown }
          | { headers: unknown }
        ? [reqInit: Parameters<this['fetchMap'][Path]>[1]]
        : [reqInit?: Parameters<this['fetchMap'][Path]>[1]]
      : [reqInit?: never]
  ): Promise<
    this['fetchMap'][Path] extends TypeSafeFunction
      ? ReturnType<this['fetchMap'][Path]>
      : never
  > {
    return (
      this.fetchMap[path] as (
        route: string,
        request?: unknown
      ) => Promise<unknown>
    )(
      path as string,
      reqInit
    ) as this['fetchMap'][Path] extends TypeSafeFunction
      ? ReturnType<this['fetchMap'][Path]>
      : never;
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
      route: SanitizePathSlashes<Route>,
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
    Name extends string,
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
      Name,
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
      Name,
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
  ): this & {
    fetchMap: Prettify<
      FetchMap &
        Record<
          SanitizePathSlashes<`${BasePath}${Path}`>,
          LiveTypeFunction<
            SV,
            SanitizePathSlashes<`${BasePath}${Path}`>,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            ContractMethod
          >
        >
    >;
    sdk: Prettify<
      Sdk &
        Record<
          PrettyCamelCase<
            Name extends string
              ? Name
              : SanitizePathSlashes<`${BasePath}${Path}`>
          >,
          Prettify<
            LiveSdkFunction<
              SV,
              P,
              ResBodyMap,
              ReqBody,
              ReqQuery,
              ReqHeaders,
              ResHeaders
            >
          >
        >
    >;
  } {
    // in this case, we know that the first argument is the typedHandler. As a result, we only use defined handlers
    if (
      isTypedHandler<
        SV,
        Name,
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
      this.registerRoute<
        Name,
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(method, path, registrationMethod, contractDetails, ...handlers);

      return this as this & {
        fetchMap: Prettify<
          FetchMap &
            Record<
              SanitizePathSlashes<`${BasePath}${Path}`>,
              LiveTypeFunction<
                SV,
                SanitizePathSlashes<`${BasePath}${Path}`>,
                P,
                ResBodyMap,
                ReqBody,
                ReqQuery,
                ReqHeaders,
                ResHeaders,
                ContractMethod
              >
            >
        >;
        sdk: Prettify<
          Sdk &
            Record<
              PrettyCamelCase<
                Name extends string
                  ? Name
                  : SanitizePathSlashes<`${BasePath}${Path}`>
              >,
              Prettify<
                LiveSdkFunction<
                  SV,
                  P,
                  ResBodyMap,
                  ReqBody,
                  ReqQuery,
                  ReqHeaders,
                  ResHeaders
                >
              >
            >
        >;
      };
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
          Name,
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
        this.registerRoute<
          Name,
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
        );

        return this as this & {
          fetchMap: Prettify<
            FetchMap &
              Record<
                SanitizePathSlashes<`${BasePath}${Path}`>,
                LiveTypeFunction<
                  SV,
                  SanitizePathSlashes<`${BasePath}${Path}`>,
                  P,
                  ResBodyMap,
                  ReqBody,
                  ReqQuery,
                  ReqHeaders,
                  ResHeaders,
                  ContractMethod
                >
              >
          >;
          sdk: Prettify<
            Sdk &
              Record<
                PrettyCamelCase<
                  Name extends string
                    ? Name
                    : SanitizePathSlashes<`${BasePath}${Path}`>
                >,
                Prettify<
                  LiveSdkFunction<
                    SV,
                    P,
                    ResBodyMap,
                    ReqBody,
                    ReqQuery,
                    ReqHeaders,
                    ResHeaders
                  >
                >
              >
          >;
        };
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
            Name,
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
            Name,
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
            Name,
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
          Name,
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

        const localParamRequest = this.#localParamRequest(
          handlers,
          controllerHandler
        );

        Object.assign(this.fetchMap, {
          [sanitizePathSlashes(`${this.basePath}${path}`)]: localParamRequest
        });
        Object.assign(this.sdk, {
          [toPrettyCamelCase(contractDetails.name ?? this.basePath)]: (
            req: Parameters<typeof localParamRequest>[1]
          ) => localParamRequest(`${this.basePath}${path}`, req)
        });

        return this as this & {
          fetchMap: Prettify<
            FetchMap &
              Record<
                SanitizePathSlashes<`${BasePath}${Path}`>,
                LiveTypeFunction<
                  SV,
                  SanitizePathSlashes<`${BasePath}${Path}`>,
                  P,
                  ResBodyMap,
                  ReqBody,
                  ReqQuery,
                  ReqHeaders,
                  ResHeaders,
                  ContractMethod
                >
              >
          >;
          sdk: Prettify<
            Sdk &
              Record<
                PrettyCamelCase<
                  Name extends string
                    ? Name
                    : SanitizePathSlashes<`${BasePath}${Path}`>
                >,
                Prettify<
                  LiveSdkFunction<
                    SV,
                    P,
                    ResBodyMap,
                    ReqBody,
                    ReqQuery,
                    ReqHeaders,
                    ResHeaders
                  >
                >
              >
          >;
        };
      }
    }
  }

  #extractHandlers<
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
      | RouterHandler
    )[],
    processMiddleware?: (handler: unknown) => RouterHandler | Internal
  ) {
    const last = handlers.pop();
    let finalHandlers = last ? [last] : [];
    if (
      isTypedHandler<
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
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
    )[]
  ) {
    return this.#extractHandlers<
      Name,
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
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ) {
    return this.#extractHandlers<
      Name,
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
        NextFunction,
        FetchMap,
        Sdk,
        SdkName
      >(handler)
        ? handler.internal
        : (handler as RouterHandler)
    );
  }

  #processTypedHandlerOrMiddleware<
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
      | undefined,
    middleware: RouterHandler[]
  ) {
    if (
      isTypedHandler<
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
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
      | undefined,
    middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
    )[]
  ) {
    const middleware: RouterHandler[] = [];

    this.#processTypedHandlerOrMiddleware<
      Name,
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
        Name,
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
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
      | undefined,
    middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ) {
    const middleware: (RouterHandler | Internal)[] = [];

    this.#processTypedHandlerOrMiddleware<
      Name,
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
        NextFunction,
        FetchMap,
        Sdk,
        SdkName
      >(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      middleware.push(contractDetailsOrMiddlewareOrTypedHandler.internal);
    }

    middleware.push(
      ...this.#extractNestableMiddlewareFromEnrichedTypedHandlerArray<
        Name,
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
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
    )[]
  ): this {
    const middleware: RouterHandler[] = [];

    if (typeof pathOrContractDetailsOrMiddlewareOrTypedHandler === 'string') {
      middleware.push(
        ...this.#extractMiddlewareAsRouterHandlers<
          Name,
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
          Name,
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
          (
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
              BaseRequest,
              BaseResponse,
              NextFunction
            >(contractDetailsOrMiddlewareOrTypedHandler)
              ? [contractDetailsOrMiddlewareOrTypedHandler]
              : []) as (
              | MiddlewareOrMiddlewareWithTypedHandler<
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
                  BaseRequest,
                  BaseResponse,
                  NextFunction
                >
              | RouterHandler
            )[]
          ).concat(middlewareOrMiddlewareWithTypedHandler)
        )
      );
      registrationMethod.bind(this.internal)(...middleware);
    }
    return this;
  }

  registerNestableMiddlewareHandler<
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ): this {
    let middleware: (RouterHandler | Internal)[] = [];
    let path: `/${string}` | undefined;

    if (typeof pathOrContractDetailsOrMiddlewareOrTypedHandler === 'string') {
      middleware.push(
        ...this.#extractNestableMiddlewareAsRouterHandlers<
          Name,
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
        const router = pathOrContractDetailsOrMiddlewareOrTypedHandler;
        Object.assign(
          this.fetchMap,
          Object.fromEntries(
            Object.entries(router.fetchMap as FetchMap).map(([key, value]) => [
              sanitizePathSlashes(`${this.basePath}${key}`),
              value
            ])
          )
        );
        Object.assign(this.sdk, {
          [router.sdkName ?? toPrettyCamelCase(router.basePath)]: router.sdk
        });
        path = router.basePath;
      }
      middleware.push(
        ...this.#extractNestableMiddlewareAsRouterHandlers<
          Name,
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

    middleware = middleware.map((m) =>
      typeof m === 'object' && m && 'internal' in m
        ? (m.internal as Internal)
        : m
    );

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
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    Router extends ConstrainedForklaunchRouter<SV, RouterHandler>
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
      Name,
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
    ) as this & {
      fetchMap: FetchMap & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${BasePath}${Key}`>
          : never]: Router['fetchMap'][Key];
      };
    };
  };

  all: TypedMiddlewareDefinition<
    this,
    SV,
    BaseRequest,
    BaseResponse,
    NextFunction,
    RouterHandler
  > = <
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
    )[]
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
    NextFunction,
    RouterHandler
  > = <
    Name extends string,
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler,
    contractDetailsOrMiddlewareOrTypedHandler?:
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler,
    ...middlewareOrMiddlewareWithTypedHandler: (
      | MiddlewareOrMiddlewareWithTypedHandler<
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
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | RouterHandler
    )[]
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
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
    RouterHandler,
    Internal,
    BaseRequest,
    BaseResponse,
    NextFunction,
    this
  > = <
    Name extends string,
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
      Name,
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
      Name,
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
    return this.registerRoute<
      Name,
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
    );
  };
}
