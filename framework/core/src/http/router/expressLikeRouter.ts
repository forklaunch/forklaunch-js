import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';

import {
  EmptyObject,
  isRecord,
  Prettify,
  PrettyCamelCase,
  sanitizePathSlashes,
  SanitizePathSlashes,
  toPrettyCamelCase,
  toRecord,
  TypeSafeFunction
} from '@forklaunch/common';
import { hasVersionedSchema } from '../guards/hasVersionedSchema';
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
  LiveTypeFunction,
  VersionedRequests,
  VersionedResponses
} from '../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  HttpMethod,
  Method,
  ParamsDictionary,
  ParamsObject,
  PathParamHttpContractDetails,
  PathParamMethod,
  QueryObject,
  ResponseCompiledSchema,
  ResponsesObject,
  SchemaAuthMethods,
  VersionSchema
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
import { FetchFunction } from '../types/sdk.types';
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
  FetchMap extends Record<string, unknown> = EmptyObject,
  Sdk extends Record<string, unknown> = EmptyObject
> implements ConstrainedForklaunchRouter<SV, RouterHandler>
{
  requestHandler!: RouterHandler;
  routers: ForklaunchRouter<SV>[] = [];
  routes: ForklaunchRoute<SV>[] = [];

  fetchMap: FetchMap = {} as FetchMap;
  sdk: Sdk = {} as Sdk;

  sdkPaths: Record<string, string> = {};

  constructor(
    readonly basePath: BasePath,
    readonly schemaValidator: SV,
    readonly internal: Internal,
    readonly postEnrichMiddleware: RouterHandler[],
    readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>
  ) {
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
    ContractMethod extends Method,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, ContractMethod>
  >(
    path: string,
    contractDetails: PathParamHttpContractDetails<SV>,
    requestSchema: unknown | Record<string, unknown>,
    responseSchemas:
      | ResponseCompiledSchema
      | Record<string, ResponseCompiledSchema>
  ): ExpressLikeSchemaHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    VersionedApi,
    BaseRequest,
    BaseResponse,
    NextFunction
  >[] {
    return [
      enrichDetails<
        SV,
        ContractMethod,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        VersionedApi
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
        ContractMethod,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        VersionedApi
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
      VersionedApi,
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
    LocalsObj extends Record<string, unknown>,
    VersionedReqs extends VersionedRequests,
    VersionedResps extends VersionedResponses
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
      VersionedReqs,
      VersionedResps,
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
    VersionedReqs,
    VersionedResps,
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
    LocalsObj extends Record<string, unknown>,
    VersionedReqs extends VersionedRequests,
    VersionedResps extends VersionedResponses
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
      VersionedReqs,
      VersionedResps,
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
    VersionedReqs,
    VersionedResps,
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

  #processContractDetailsIO<P extends ParamsObject<SV>>(
    contractDetailsIO: {
      requestHeaders?: HeadersObject<SV>;
      responseHeaders?: HeadersObject<SV>;
      query?: QueryObject<SV>;
      body?: Body<SV>;
      responses: ResponsesObject<SV>;
    },
    params?: P
  ) {
    const schemaValidator = this.schemaValidator as SchemaValidator;

    const responseSchemas = {
      400: schemaValidator.string,
      401: schemaValidator.string,
      403: schemaValidator.string,
      404: schemaValidator.string,
      500: schemaValidator.string,
      ...Object.fromEntries(
        Object.entries(
          discriminateResponseBodies(
            this.schemaValidator,
            contractDetailsIO.responses
          )
        ).map(([key, value]) => {
          return [Number(key), value.schema];
        })
      )
    };

    return {
      requestSchema: schemaValidator.compile(
        schemaValidator.schemify({
          ...(params != null
            ? { params }
            : { params: schemaValidator.unknown as ParamsObject<SV> }),
          ...(contractDetailsIO.requestHeaders != null
            ? { headers: contractDetailsIO.requestHeaders }
            : { headers: schemaValidator.unknown as HeadersObject<SV> }),
          ...(contractDetailsIO.query != null
            ? { query: contractDetailsIO.query }
            : { query: schemaValidator.unknown as QueryObject<SV> }),
          ...(contractDetailsIO.body != null
            ? {
                body: discriminateBody(
                  this.schemaValidator,
                  contractDetailsIO.body
                )?.schema
              }
            : { body: schemaValidator.unknown as Body<SV> })
        })
      ),
      responseSchemas: {
        ...(contractDetailsIO.responseHeaders != null
          ? {
              headers: schemaValidator.compile(
                schemaValidator.schemify(contractDetailsIO.responseHeaders)
              )
            }
          : { headers: schemaValidator.unknown as HeadersObject<SV> }),
        responses: Object.fromEntries(
          Object.entries(responseSchemas).map(([key, value]) => {
            return [
              key,
              schemaValidator.compile(schemaValidator.schemify(value))
            ];
          })
        )
      }
    };
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
    ResHeaders extends HeadersObject<SV>,
    const VersionedApi extends VersionSchema<SV, ContractMethod>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      Auth
    >
  ) {
    const schemaValidator = this.schemaValidator as SchemaValidator;

    let requestSchema: unknown | Record<string, unknown>;
    let responseSchemas:
      | ResponseCompiledSchema
      | Record<string, ResponseCompiledSchema>;

    if (hasVersionedSchema(contractDetails)) {
      requestSchema = {};
      responseSchemas = {};

      Object.entries(contractDetails.versions ?? {}).forEach(
        ([version, versionedContractDetails]) => {
          const {
            requestSchema: versionedRequestSchema,
            responseSchemas: versionedResponseSchemas
          } = this.#processContractDetailsIO(
            versionedContractDetails,
            contractDetails.params
          );

          if (isRecord(requestSchema)) {
            requestSchema = {
              ...requestSchema,
              [version]: versionedRequestSchema
            };
          }
          if (isRecord(responseSchemas)) {
            responseSchemas = {
              ...responseSchemas,
              [version]: versionedResponseSchemas
            };
          }
        }
      );
    } else {
      const {
        requestSchema: unversionedRequestSchema,
        responseSchemas: unversionedResponseSchemas
      } = this.#processContractDetailsIO(
        {
          ...('params' in contractDetails && contractDetails.params != null
            ? { params: contractDetails.params }
            : { params: schemaValidator.unknown as ParamsObject<SV> }),
          ...('requestHeaders' in contractDetails &&
          contractDetails.requestHeaders != null
            ? { requestHeaders: contractDetails.requestHeaders }
            : {
                requestHeaders: schemaValidator.unknown as HeadersObject<SV>
              }),
          ...('responseHeaders' in contractDetails &&
          contractDetails.responseHeaders != null
            ? { responseHeaders: contractDetails.responseHeaders }
            : {
                responseHeaders: schemaValidator.unknown as HeadersObject<SV>
              }),
          ...('query' in contractDetails && contractDetails.query != null
            ? { query: contractDetails.query }
            : {
                query: schemaValidator.unknown as QueryObject<SV>
              }),
          ...('body' in contractDetails && contractDetails.body != null
            ? { body: contractDetails.body }
            : {
                body: schemaValidator.unknown as Body<SV>
              }),
          responses:
            'responses' in contractDetails && contractDetails.responses != null
              ? contractDetails.responses
              : (schemaValidator.unknown as ResponsesObject<SV>)
        },
        contractDetails.params
      );

      requestSchema = unversionedRequestSchema;
      responseSchemas = unversionedResponseSchemas;
    }

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
  fetch: FetchFunction<this['fetchMap']> = async <
    Path extends keyof this['fetchMap'],
    Method extends keyof this['fetchMap'][Path],
    Version extends keyof this['fetchMap'][Path][Method]
  >(
    path: Path,
    ...reqInit: this['fetchMap'][Path][Method] extends TypeSafeFunction
      ? 'GET' extends keyof this['fetchMap'][Path]
        ? this['fetchMap'][Path]['GET'] extends TypeSafeFunction
          ? Parameters<this['fetchMap'][Path]['GET']>[1] extends
              | {
                  body: unknown;
                }
              | { query: unknown }
              | { params: unknown }
              | { headers: unknown }
              | { version: unknown }
            ? [
                reqInit: Omit<
                  Parameters<this['fetchMap'][Path][Method]>[1],
                  'method'
                > & {
                  method: Method;
                }
              ]
            : [
                reqInit?: Omit<
                  Parameters<this['fetchMap'][Path][Method]>[1],
                  'method'
                > & {
                  method: Method;
                }
              ]
          : [
              reqInit: Omit<
                Parameters<this['fetchMap'][Path][Method]>[1],
                'method'
              > & {
                method: Method;
              }
            ]
        : [
            reqInit: Omit<
              Parameters<this['fetchMap'][Path][Method]>[1],
              'method'
            > & {
              method: Method;
            }
          ]
      : this['fetchMap'][Path][Method] extends Record<string, TypeSafeFunction>
        ? [
            reqInit: Omit<
              Parameters<this['fetchMap'][Path][Method][Version]>[0],
              'method' | 'version'
            > & {
              method: Method;
              version: Version;
            }
          ]
        : [{ method: Method }]
  ) => {
    return (
      this.fetchMap[path] as (route: string, request?: unknown) => unknown
    )(
      path as string,
      reqInit[0]
      // reqInit
    ) as this['fetchMap'][Path][Method] extends TypeSafeFunction
      ? Awaited<ReturnType<this['fetchMap'][Path][Method]>>
      : this['fetchMap'][Path][Method] extends Record<string, TypeSafeFunction>
        ? Awaited<ReturnType<this['fetchMap'][Path][Method][Version]>>
        : never;
  };

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
        params?: Record<string, unknown>;
        query?: Record<string, unknown>;
        headers?: Record<string, unknown>;
        body?: Record<string, unknown>;
      }
    ) => {
      let statusCode;
      let responseMessage;
      const responseHeaders: Record<string, unknown> = {};

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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, ContractMethod>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
    >[]
  ): this & {
    fetchMap: Prettify<
      FetchMap extends Record<
        SanitizePathSlashes<`${BasePath}${Path}`>,
        unknown
      >
        ? FetchMap &
            Record<
              SanitizePathSlashes<`${BasePath}${Path}`>,
              FetchMap[SanitizePathSlashes<`${BasePath}${Path}`>] &
                Record<
                  Uppercase<ContractMethod>,
                  LiveTypeFunction<
                    SV,
                    SanitizePathSlashes<`${BasePath}${Path}`>,
                    P,
                    ResBodyMap,
                    ReqBody,
                    ReqQuery,
                    ReqHeaders,
                    ResHeaders,
                    ContractMethod,
                    VersionedApi,
                    Auth
                  >
                >
            >
        : FetchMap &
            Record<
              SanitizePathSlashes<`${BasePath}${Path}`>,
              Record<
                Uppercase<ContractMethod>,
                LiveTypeFunction<
                  SV,
                  SanitizePathSlashes<`${BasePath}${Path}`>,
                  P,
                  ResBodyMap,
                  ReqBody,
                  ReqQuery,
                  ReqHeaders,
                  ResHeaders,
                  ContractMethod,
                  VersionedApi,
                  Auth
                >
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
          LiveSdkFunction<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            VersionedApi,
            Auth
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
        VersionedApi,
        BaseRequest,
        BaseResponse,
        NextFunction,
        Auth
      >(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      const { contractDetails, handlers } =
        contractDetailsOrMiddlewareOrTypedHandler;
      const router = this.registerRoute<
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
        VersionedApi,
        Auth
      >(method, path, registrationMethod, contractDetails, ...handlers);

      return router;
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
        >(maybeTypedHandler)
      ) {
        const { contractDetails, handlers } = maybeTypedHandler;
        const router = this.registerRoute<
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
          VersionedApi,
          Auth
        >(
          method,
          path,
          registrationMethod,
          contractDetails,
          ...middlewareOrMiddlewareAndTypedHandler.concat(handlers)
        );

        return router;
      } else {
        if (
          isExpressLikeSchemaHandler<
            SV,
            ContractMethod,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj,
            VersionedApi,
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
            VersionedApi,
            BaseRequest,
            BaseResponse,
            NextFunction,
            Auth
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
            ContractMethod,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj,
            VersionedApi,
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
            VersionedApi extends VersionSchema<SV, HttpMethod>
              ? VersionedApi
              : never,
            BaseRequest,
            Auth
          >(contractDetails) &&
          !isPathParamHttpContractDetails<
            SV,
            Name,
            Path,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            VersionedApi extends VersionSchema<SV, PathParamMethod>
              ? VersionedApi
              : never,
            BaseRequest,
            Auth
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
          ResHeaders,
          VersionedApi,
          Auth
        >(contractDetails);

        const controllerHandler = this.#extractControllerHandler(handlers);

        const resolvedMiddlewares = this.#resolveMiddlewares<
          P,
          ContractMethod,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          VersionedApi
        >(
          path,
          contractDetails as PathParamHttpContractDetails<SV>,
          requestSchema,
          responseSchemas
        ).concat(handlers);

        registrationMethod.bind(this.internal)(
          path,
          ...(resolvedMiddlewares as RouterHandler[]),
          this.#parseAndRunControllerHandler(controllerHandler) as RouterHandler
        );

        const localParamRequest = this.#localParamRequest(
          handlers,
          controllerHandler
        );

        toRecord(this.fetchMap)[
          sanitizePathSlashes(`${this.basePath}${path}`)
        ] = localParamRequest;

        toRecord(this.sdk)[
          toPrettyCamelCase(contractDetails.name ?? this.basePath)
        ] = (req: Parameters<typeof localParamRequest>[1]) =>
          localParamRequest(`${this.basePath}${path}`, req);
        return this as this & {
          fetchMap: FetchMap extends Record<
            SanitizePathSlashes<`${BasePath}${Path}`>,
            unknown
          >
            ? FetchMap &
                Record<
                  SanitizePathSlashes<`${BasePath}${Path}`>,
                  FetchMap[SanitizePathSlashes<`${BasePath}${Path}`>] &
                    Record<
                      Uppercase<ContractMethod>,
                      LiveTypeFunction<
                        SV,
                        SanitizePathSlashes<`${BasePath}${Path}`>,
                        P,
                        ResBodyMap,
                        ReqBody,
                        ReqQuery,
                        ReqHeaders,
                        ResHeaders,
                        ContractMethod,
                        VersionedApi,
                        Auth
                      >
                    >
                >
            : FetchMap &
                Record<
                  SanitizePathSlashes<`${BasePath}${Path}`>,
                  Record<
                    Uppercase<ContractMethod>,
                    LiveTypeFunction<
                      SV,
                      SanitizePathSlashes<`${BasePath}${Path}`>,
                      P,
                      ResBodyMap,
                      ReqBody,
                      ReqQuery,
                      ReqHeaders,
                      ResHeaders,
                      ContractMethod,
                      VersionedApi,
                      Auth
                    >
                  >
                >;
          sdk: Sdk &
            Record<
              PrettyCamelCase<
                Name extends string
                  ? Name
                  : SanitizePathSlashes<`${BasePath}${Path}`>
              >,
              LiveSdkFunction<
                SV,
                P,
                ResBodyMap,
                ReqBody,
                ReqQuery,
                ReqHeaders,
                ResHeaders,
                VersionedApi,
                Auth
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
    ArrayReturnType,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
        VersionedApi,
        BaseRequest,
        BaseResponse,
        NextFunction,
        Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      RouterHandler,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      RouterHandler | Internal,
      VersionedApi,
      Auth
    >(handlers, (handler) => {
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
          Sdk
        >(handler)
      ) {
        this.addRouterToSdk(handler);
        return handler.internal;
      }
      return handler as RouterHandler;
    });
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
        VersionedApi,
        BaseRequest,
        BaseResponse,
        NextFunction,
        Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
        LocalsObj,
        VersionedApi,
        Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
        VersionedApi,
        BaseRequest,
        BaseResponse,
        NextFunction,
        Auth
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
        Sdk
      >(contractDetailsOrMiddlewareOrTypedHandler)
    ) {
      this.addRouterToSdk(contractDetailsOrMiddlewareOrTypedHandler);
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
        LocalsObj,
        VersionedApi,
        Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          LocalsObj,
          VersionedApi,
          Auth
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
          LocalsObj,
          VersionedApi,
          Auth
        >(
          pathOrContractDetailsOrMiddlewareOrTypedHandler,
          (
            (isExpressLikeSchemaHandler<
              SV,
              'middleware',
              P,
              ResBodyMap,
              ReqBody,
              ReqQuery,
              ReqHeaders,
              ResHeaders,
              LocalsObj,
              VersionedApi,
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
              VersionedApi,
              BaseRequest,
              BaseResponse,
              NextFunction,
              Auth
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
                  VersionedApi,
                  BaseRequest,
                  BaseResponse,
                  NextFunction,
                  Auth
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

  private addRouterToSdk(
    router: ConstrainedForklaunchRouter<SV, RouterHandler>
  ) {
    Object.entries(router.fetchMap).map(
      ([key, value]) =>
        (toRecord(this.fetchMap)[
          sanitizePathSlashes(`${this.basePath}${key}`)
        ] = value)
    );

    const existingSdk =
      this.sdk[router.sdkName ?? toPrettyCamelCase(router.basePath)];
    toRecord(this.sdk)[router.sdkName ?? toPrettyCamelCase(router.basePath)] = {
      ...(typeof existingSdk === 'object' ? existingSdk : {}),
      ...router.sdk
    };
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
        >
      | ConstrainedForklaunchRouter<SV, RouterHandler>
    )[]
  ): this {
    const middleware: (RouterHandler | Internal)[] = [];
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
          LocalsObj,
          VersionedApi,
          Auth
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

        this.addRouterToSdk(router);
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
          LocalsObj,
          VersionedApi,
          Auth
        >(
          pathOrContractDetailsOrMiddlewareOrTypedHandler,
          (isExpressLikeSchemaHandler<
            SV,
            'middleware',
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj,
            VersionedApi,
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
            VersionedApi,
            BaseRequest,
            BaseResponse,
            NextFunction,
            Auth
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

    if (!path) {
      path = middleware.filter((m) =>
        isForklaunchExpressLikeRouter<
          SV,
          Path,
          RouterHandler,
          Internal,
          BaseRequest,
          BaseResponse,
          NextFunction,
          FetchMap,
          Sdk
        >(m)
      )[0]?.basePath;
    }

    // middleware = middleware.map((m) =>
    //   typeof m === 'object' && m && 'internal' in m
    //     ? (m.internal as Internal)
    //     : m
    // );

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
    Router extends ConstrainedForklaunchRouter<SV, RouterHandler>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
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
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
      sdk: Sdk & {
        [Key in PrettyCamelCase<
          Router extends { sdkName?: string; basePath: string }
            ? string extends Router['sdkName']
              ? Router['basePath']
              : Router['sdkName']
            : never
        >]: Router['sdk'];
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
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
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'middleware'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
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
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
          VersionedApi,
          BaseRequest,
          BaseResponse,
          NextFunction,
          Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'get'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'post'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'put'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'patch'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'delete'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'options'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'head'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
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
    LocalsObj extends Record<string, unknown>,
    const VersionedApi extends VersionSchema<SV, 'trace'>,
    const Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth
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
      LocalsObj,
      VersionedApi,
      Auth
    >(
      'trace',
      path,
      this.internal.trace,
      contractDetailsOrMiddlewareOrTypedHandler,
      ...middlewareOrMiddlewareWithTypedHandler
    );
  };

  protected cloneInternals(clone: this): void {
    clone.routers = [...this.routers];
    clone.routes = [...this.routes];
    clone.fetchMap = { ...this.fetchMap };
    clone.sdk = { ...this.sdk };
    clone.sdkPaths = { ...this.sdkPaths };
  }

  clone(): this {
    const clone = new ForklaunchExpressLikeRouter<
      SV,
      BasePath,
      RouterHandler,
      Internal,
      BaseRequest,
      BaseResponse,
      NextFunction,
      FetchMap,
      Sdk
    >(
      this.basePath,
      this.schemaValidator,
      this.internal,
      this.postEnrichMiddleware,
      this.openTelemetryCollector
    ) as this;

    this.cloneInternals(clone);

    return clone;
  }
}
