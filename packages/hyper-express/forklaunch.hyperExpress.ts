import {
  Body,
  ForklaunchRoute,
  ForklaunchRouter,
  HeadersObject,
  HttpContractDetails,
  ParamsDictionary,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject,
  createRequestContext,
  enrichRequestDetails,
  generateStringFromRegex,
  generateSwaggerDocument,
  parseRequestAuth,
  parseRequestBody,
  parseRequestHeaders,
  parseRequestParams,
  parseRequestQuery
} from '@forklaunch/core';
import {
  MiddlewareHandler as ExpressMiddlewareHandler,
  Router as ExpressRouter,
  MiddlewareNext,
  Server,
  UsableSpreadableArguments
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import * as uWebsockets from 'uWebSockets.js';
import { contentParse } from './middleware/contentParse.middleware';
import { polyfillGetHeaders } from './middleware/polyfillGetHeaders.middleware';
import { corsMiddleware, enrichResponseTransmission } from './middleware/response.middleware';
import { swagger, swaggerRedirect } from './middleware/swagger.middleware';
import {
  LiveTypeFunction,
  MiddlewareHandler,
  Request,
  Response,
  SchemaMiddlewareHandler
} from './types/forklaunch.hyperExpress.types';

/**
 * Represents an application built on top of Hyper-Express and Forklaunch.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export class Application<SV extends AnySchemaValidator> {
  private internal = new Server();
  private routers: ForklaunchRouter<SV>[] = [];

  /**
   * Creates an instance of the Application class.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(private schemaValidator: SV) { }

  /**
   * Registers middleware or routers to the application.
   *
   * @param {ForklaunchRouter<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[]} router - The router or middleware to register.
   * @param {...(ForklaunchRouter<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[])} args - Additional arguments.
   * @returns {this} - The application instance.
   */
  use(
    router: ForklaunchRouter<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[],
    ...args: (ForklaunchRouter<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[])[]
  ): this {
    if (router instanceof Router) {
      this.routers.push(router);
      this.internal.use(router.basePath, router.internal);
      return this;
    } else {
      const router = args.pop();
      if (!(router instanceof Router)) {
        throw new Error('Last argument must be a router');
      }

      args.forEach((arg) => {
        if (arg instanceof Router) {
          throw new Error('Only one router is allowed');
        }
      });

      this.internal.use(
        router.basePath as string,
        ...(args as unknown as (
          | ExpressMiddlewareHandler
          | ExpressMiddlewareHandler[]
        )[]),
        router.internal
      );
      return this;
    }
  }

  /**
   * Starts the server and sets up Swagger documentation.
   *
   * @param {string | number} arg0 - The port number or UNIX path to listen on.
   * @param {...unknown[]} args - Additional arguments.
   * @returns {Promise<uWebsockets.us_listen_socket>} - A promise that resolves with the listening socket.
   */
  listen(
    port: number,
    callback?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket>;
  listen(
    port: number,
    host?: string,
    callback?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket>;
  listen(
    unix_path: string,
    callback?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket>;
  listen(
    arg0: number | string,
    arg1?: string | ((listen_socket: uWebsockets.us_listen_socket) => void),
    arg2?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket> {
    if (typeof arg0 === 'number') {
      const port = arg0 || Number(process.env.PORT);

      const swaggerPath = `/api${process.env.VERSION ?? '/v1'}${process.env.SWAGGER_PATH ?? '/swagger'}`;
      this.internal.use(swaggerPath, swaggerRedirect(swaggerPath));
      this.internal.get(
        `${swaggerPath}/*`,
        swagger(
          swaggerPath,
          generateSwaggerDocument(this.schemaValidator, port, this.routers)
        )
      );

      if (arg1 && typeof arg1 === 'string') {
        return this.internal.listen(port, arg1, arg2);
      } else if (arg1 && typeof arg1 === 'function') {
        return this.internal.listen(port, arg1);
      }
    }

    return this.internal.listen(
      arg0 as string,
      arg1 as (listen_socket: uWebsockets.us_listen_socket) => void
    );
  }
}

/**
 * Creates a new instance of Application with the given schema validator.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Application<SV>} - The new application instance.
 */
export default function forklaunchExpress<SV extends AnySchemaValidator>(
  schemaValidator: SV
) {
  return new Application(schemaValidator);
}

/**
 * Represents a router that sets up routes and middleware for an Express router.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @implements {ForklaunchRouter<SV>}
 */
export class Router<SV extends AnySchemaValidator, BasePath extends `/${string}`>
  implements ForklaunchRouter<SV>
{
  readonly routes: ForklaunchRoute<SV>[] = [];
  readonly internal: ExpressRouter = new ExpressRouter();

  /**
   * Creates an instance of the Router class.
   *
   * @param {string} basePath - The base path for the router.
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    public basePath: BasePath,
    private schemaValidator: SV
  ) {
    this.internal.use(polyfillGetHeaders);
    this.internal.use(contentParse);
    this.internal.use(
      createRequestContext(
        this.schemaValidator
      ) as unknown as ExpressMiddlewareHandler
    );
    this.internal.use(
      enrichResponseTransmission as unknown as ExpressMiddlewareHandler
    );

    this.internal.options('*', corsMiddleware as unknown as ExpressMiddlewareHandler);
  }

  /**
   * Resolves middlewares based on the contract details.
   *
   * @param {PathParamHttpContractDetails<SV> | HttpContractDetails<SV>} contractDetails - The contract details.
   * @returns {MiddlewareHandler<SV>[]} - The resolved middlewares.
   */
  private resolveMiddlewares(
    contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>
  ): MiddlewareHandler<SV>[] {
    const middlewares = [
      // corsMiddleware,
      enrichRequestDetails(contractDetails)
    ];
    if (contractDetails.params) {
      middlewares.push(parseRequestParams);
    }
    if ((contractDetails as HttpContractDetails<SV>).body) {
      middlewares.push(parseRequestBody);
    }
    if (contractDetails.requestHeaders) {
      middlewares.push(parseRequestHeaders);
    }
    if (contractDetails.query) {
      middlewares.push(parseRequestQuery);
    }
    if (contractDetails.auth) {
      middlewares.push(parseRequestAuth);
    }
    return middlewares as MiddlewareHandler<SV>[];
  }

  /**
   * Parses and runs the controller function with error handling.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @template StatusCode - The type of status code.
   * @param {MiddlewareHandler<SV, P, ResBody | string, ReqBody, ReqQuery, LocalsObj, StatusCode>} requestHandler - The request handler.
   * @returns {ExpressMiddlewareHandler} - The Express request handler.
   */
  private parseAndRunControllerFunction<
    P = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = ParsedQs,
    RequestHeaders = Record<string, string>,
    ResponseHeaders = Record<string, string>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>,
    StatusCode extends number = number
  >(
    requestHandler: MiddlewareHandler<
      SV,
      P,
      ResBody | string,
      ReqBody,
      ReqQuery,
      RequestHeaders,
      ResponseHeaders,
      LocalsObj,
      StatusCode
    >
  ): MiddlewareHandler<
    SV,
    P,
    ResBody | string,
    ReqBody,
    ReqQuery,
    RequestHeaders,
    ResponseHeaders,
    LocalsObj,
    StatusCode
  > {
    return async (
      req: Request<SV, P, ReqBody, ReqQuery, RequestHeaders, LocalsObj>,
      res: Response<ResBody | string, ResponseHeaders, LocalsObj, StatusCode>,
      next?: MiddlewareNext
    ) => {
      if (!requestHandler) {
        throw new Error('Controller function is not defined');
      }

      try {
        await requestHandler(req, res, next);
      } catch (error) {
        if (next) {
          next(error as Error);
        }

        console.error(error);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        }
      }
    };
  }

  /**
   * Extracts the controller function from the provided functions.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {MiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The provided functions.
   * @returns {MiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>} - The extracted controller function.
   * @throws {Error} - Throws an error if the last argument is not a function.
   */
  private extractControllerFunction<
    P = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = ParsedQs,
    RequestHeaders = Record<string, string>,
    ResponseHeaders = Record<string, string>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    functions: MiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, RequestHeaders, ResponseHeaders, LocalsObj>[]
  ): MiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, RequestHeaders, ResponseHeaders, LocalsObj> {
    const controllerFunction = functions.pop();

    if (typeof controllerFunction !== 'function') {
      throw new Error('Last argument must be a function');
    }

    return controllerFunction;
  }

  /**
   * Extracts the SDK path from the given path.
   *
   * @param {string | RegExp | (string | RegExp)[]} path - The provided path.
   * @returns {string} - The extracted SDK path.
   * @throws {Error} - Throws an error if the path is not defined.
   */
  private extractSdkPath(path: string | RegExp | (string | RegExp)[]): string {
    let sdkPath = path;

    if (Array.isArray(path)) {
      sdkPath = path.pop() || path[0];
    }

    if (!sdkPath) {
      throw new Error('Path is not defined');
    }

    if (sdkPath instanceof RegExp) {
      sdkPath = generateStringFromRegex(sdkPath);
    }

    return sdkPath as string;
  }

  /**
   * Registers middleware to the router.
   *
   * @param {...unknown[]} args - The middleware to register.
   * @returns {this} - The router instance.
   */
  use(...args: unknown[]): this {
    this.internal.use(...(args as UsableSpreadableArguments));
    return this;
  }

  private localParamRequest<
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBody extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV>
  >(functions: ExpressMiddlewareHandler[], controllerFunction: ExpressMiddlewareHandler) {
    return (async (
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
          path: route,

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
        
        let cursor = functions.shift() as unknown as (req_: typeof req, resp_: typeof res, next: MiddlewareNext) => void;
        if (cursor) {
          for (const fn of functions) {
            await cursor(req, res, (err?: Error) => {
              if (err) {
                throw err;
              }

              cursor = fn as unknown as (req_: typeof req, resp_: typeof res, next: MiddlewareNext) => void;
            });
          } 
          await cursor(req, res, async (err?: Error) => {
            if (err) {
                throw err;
              }
          })
        } 

        const cFunction = controllerFunction as unknown as (req_: typeof req, resp_: typeof res, next: MiddlewareNext) => void;
        await cFunction(req, res, (err?: Error) => {
          if (err) {
            throw err;
          }
        });

        return {
          code: statusCode,
          response: responseMessage,
          headers: responseHeaders
        } 
      }) as LiveTypeFunction<SV, `${BasePath}${Path}`, P, ResBody, ReqBody, ReqQuery, RequestHeaders, ResponseHeaders>;
  }

  /**
   * Registers a GET route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  get<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  > (
    path: Path,
    contractDetails: PathParamHttpContractDetails<SV, P, ResBody, ReqQuery, RequestHeaders, ResponseHeaders>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      RequestHeaders,
      ResponseHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'get',
      contractDetails
    });

    this.internal.get(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as unknown as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );

    return {
      get: this.localParamRequest<
        Path,
        P,
        ResBody,
        ReqBody,
        ReqQuery,
        RequestHeaders,
        ResponseHeaders
      >(functions as unknown as ExpressMiddlewareHandler[], controllerFunction as unknown as ExpressMiddlewareHandler)
    };
  }

  /**
   * Registers a POST route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  post<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery, RequestHeaders, ResponseHeaders>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      RequestHeaders,
      ResponseHeaders,
      LocalsObj
    >[]
  ) {
    // : LiveType<SV, P, ResBody, ReqBody, ReqQuery> {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'post',
      contractDetails
    });

    this.internal.post(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as unknown as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );

    return {
      post: this.localParamRequest<
        Path,
        P,
        ResBody,
        ReqBody,
        ReqQuery,
        RequestHeaders,
        ResponseHeaders
      >(functions as unknown as ExpressMiddlewareHandler[], controllerFunction as unknown as ExpressMiddlewareHandler)
    };
  }

  /**
   * Registers a PUT route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  put<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery, RequestHeaders, ResponseHeaders>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      RequestHeaders,
      ResponseHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'put',
      contractDetails
    });

    this.internal.put(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as unknown as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );

    return {
      put: this.localParamRequest<
        Path,
        P,
        ResBody,
        ReqBody,
        ReqQuery,
        RequestHeaders,
        ResponseHeaders
      >(functions as unknown as ExpressMiddlewareHandler[], controllerFunction as unknown as ExpressMiddlewareHandler)
    };
  }

  /**
   * Registers a PATCH route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  patch<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery, RequestHeaders, ResponseHeaders>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      RequestHeaders,
      ResponseHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'patch',
      contractDetails
    });

    this.internal.patch(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as unknown as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );

    return {
      patch: this.localParamRequest<
        Path,
        P,
        ResBody,
        ReqBody,
        ReqQuery,
        RequestHeaders,
        ResponseHeaders
      >(functions as unknown as ExpressMiddlewareHandler[], controllerFunction as unknown as ExpressMiddlewareHandler)
    };
  }

  /**
   * Registers a DELETE route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBody - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  delete<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: PathParamHttpContractDetails<SV, P, ResBody, ReqQuery, RequestHeaders, ResponseHeaders>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      RequestHeaders,
      ResponseHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'delete',
      contractDetails
    });

    this.internal.delete(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as unknown as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );

    return {
      delete: this.localParamRequest<
        Path,
        P,
        ResBody,
        ReqBody,
        ReqQuery,
        RequestHeaders,
        ResponseHeaders
      >(functions as unknown as ExpressMiddlewareHandler[], controllerFunction as unknown as ExpressMiddlewareHandler)
    };
  }
}

/**
 * Creates a new instance of Router with the given base path and schema validator.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {string} basePath - The base path for the router.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Router<SV>} - The new router instance.
 */
export function forklaunchRouter<SV extends AnySchemaValidator, BasePath extends `/${string}`>(
  basePath: BasePath,
  schemaValidator: SV
): Router<SV, BasePath> {
  const router = new Router(basePath, schemaValidator);
  return router;
}
