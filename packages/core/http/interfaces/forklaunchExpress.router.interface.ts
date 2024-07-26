import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import {
  enrichRequestDetails,
  parseReqHeaders,
  parseRequestAuth,
  parseRequestBody,
  parseRequestParams,
  parseRequestQuery
} from '../middleware';
import {
  Body,
  ForklaunchMiddlewareHandler,
  ForklaunchRoute,
  ForklaunchSchemaMiddlewareHandler,
  HeadersObject,
  HttpContractDetails,
  LiveTypeFunction,
  ParamsDictionary,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject
} from '../types';

interface ExpressLikeRouter<RouterFunction> {
  use: (...args: RouterFunction[]) => this;
  get(path: string, ...handlers: RouterFunction[]): void;
  post(path: string, ...handlers: RouterFunction[]): void;
  put(path: string, ...handlers: RouterFunction[]): void;
  patch(path: string, ...handlers: RouterFunction[]): void;
  delete(path: string, ...handlers: RouterFunction[]): void;
}

export abstract class ForklaunchExpressLikeRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`,
  RouterFunction,
  Internal extends ExpressLikeRouter<RouterFunction>
> {
  readonly routes: ForklaunchRoute<SV>[] = [];
  readonly basePath: BasePath;

  constructor(
    basePath: BasePath,
    readonly internal: Internal
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
    SV extends AnySchemaValidator,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    contractDetails:
      | PathParamHttpContractDetails<
          SV,
          P,
          ResBodyMap,
          ReqQuery,
          ReqHeaders,
          ResHeaders
        >
      | HttpContractDetails<SV, P, ResBodyMap, ReqQuery, ReqHeaders, ResHeaders>
  ): ForklaunchSchemaMiddlewareHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  >[] {
    const middlewares: ForklaunchSchemaMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[] = [
      enrichRequestDetails<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails)
    ];
    if (contractDetails.params) {
      middlewares.push(parseRequestParams);
    }
    if ((contractDetails as HttpContractDetails<SV>).body) {
      middlewares.push(parseRequestBody);
    }
    if (contractDetails.requestHeaders) {
      middlewares.push(parseReqHeaders);
    }
    if (contractDetails.query) {
      middlewares.push(parseRequestQuery);
    }
    if (contractDetails.auth) {
      middlewares.push(parseRequestAuth);
    }

    return middlewares;
  }

  /**
   * Parses and runs the controller function with error handling.
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
  #parseAndRunControllerFunction<
    SV extends AnySchemaValidator,
    P extends ParamsDictionary,
    ResBodyMap extends Record<number, unknown>,
    ReqBody extends Record<string, unknown>,
    ReqQuery extends ParsedQs,
    ReqHeaders extends Record<string, string>,
    ResHeaders extends Record<string, string>,
    LocalsObj extends Record<string, unknown>
  >(
    requestHandler: ForklaunchMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >
  ): ForklaunchMiddlewareHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  > {
    return (async (req, res, next) => {
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
    }) as ForklaunchMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >;
  }

  /**
   * Extracts the controller function from the provided functions.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {MiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The provided functions.
   * @returns {MiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>} - The extracted controller function.
   * @throws {Error} - Throws an error if the last argument is not a function.
   */
  #extractControllerFunction<
    SV extends AnySchemaValidator,
    P extends ParamsDictionary,
    ResBodyMap extends Record<number, unknown>,
    ReqBody extends Record<string, unknown>,
    ReqQuery extends ParsedQs,
    ReqHeaders extends Record<string, string>,
    ResHeaders extends Record<string, string>,
    LocalsObj extends Record<string, unknown>
  >(
    functions: ForklaunchMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ): ForklaunchMiddlewareHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  > {
    const controllerFunction = functions.pop();

    if (typeof controllerFunction !== 'function') {
      throw new Error('Last argument must be a function');
    }

    return controllerFunction;
  }

  // TODO: Move to UniversalSDK

  //   /**
  //    * Extracts the SDK path from the given path.
  //    *
  //    * @param {string | RegExp | (string | RegExp)[]} path - The provided path.
  //    * @returns {string} - The extracted SDK path.
  //    * @throws {Error} - Throws an error if the path is not defined.
  //    */
  //   extractSdkPath(path: string | RegExp | (string | RegExp)[]): string {
  //     let sdkPath = path;

  //     if (Array.isArray(path)) {
  //       sdkPath = path.pop() || path[0];
  //     }

  //     if (!sdkPath) {
  //       throw new Error('Path is not defined');
  //     }

  //     if (sdkPath instanceof RegExp) {
  //       sdkPath = generateStringFromRegex(sdkPath);
  //     }

  //     return sdkPath as string;
  //   }

  /**
   * Registers middleware to the router.
   *
   * @param {...unknown[]} args - The middleware to register.
   * @returns {this} - The router instance.
   */
  use(...args: unknown[]): this {
    this.internal.use(...(args as RouterFunction[]));
    return this;
  }

  /**
   * Executes request locally, applying parameters
   *
   * @param functions {ForklaunchMiddlewareHandler<SV>}
   * @param controllerFunction
   * @returns
   */
  #localParamRequest<
    Path extends `/${string}`,
    SV extends AnySchemaValidator,
    P extends ParamsDictionary,
    ResBodyMap extends Record<number, unknown>,
    ReqBody extends Record<string, unknown>,
    ReqQuery extends ParsedQs,
    ReqHeaders extends Record<string, string>,
    ResHeaders extends Record<string, string>,
    LocalsObj extends Record<string, unknown>
  >(
    functions: ForklaunchMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[],
    controllerFunction: ForklaunchMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >
  ) {
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

      // let cursor = functions.shift() as unknown as (req_: typeof req, resp_: typeof res, next: MiddlewareNext) => void;
      let cursor = functions.shift() as unknown as (
        req_: typeof req,
        resp_: typeof res,
        next: (err?: Error) => Promise<void> | void
      ) => Promise<void> | void;

      if (cursor) {
        for (const fn of functions) {
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

      const cFunction = controllerFunction as unknown as (
        req_: typeof req,
        resp_: typeof res,
        next: (err?: Error) => Promise<void> | void
      ) => void;
      await cFunction(req, res, (err?: Error) => {
        if (err) {
          throw err;
        }
      });

      return {
        code: statusCode,
        response: responseMessage,
        headers: responseHeaders
      };
    }) as LiveTypeFunction<
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

  /**
   * Registers a GET route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  get<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: PathParamHttpContractDetails<
      SV,
      P,
      ResBodyMap,
      ReqQuery,
      ReqHeaders,
      ResHeaders
    >,
    ...functions: ForklaunchSchemaMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.#extractControllerFunction(functions);

    this.routes.push({
      basePath: this.basePath,
      path,
      method: 'GET',
      contractDetails
    });

    this.internal.get(
      path,
      ...(this.#resolveMiddlewares<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails).concat(functions) as RouterFunction[]),
      this.#parseAndRunControllerFunction(controllerFunction) as RouterFunction
    );

    return {
      get: this.#localParamRequest(functions, controllerFunction)
    };
  }

  /**
   * Registers a POST route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  post<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: HttpContractDetails<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders
    >,
    ...functions: ForklaunchSchemaMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.#extractControllerFunction(functions);

    this.routes.push({
      basePath: this.basePath,
      path,
      method: 'POST',
      contractDetails
    });

    this.internal.post(
      path,
      ...(this.#resolveMiddlewares<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails).concat(functions) as RouterFunction[]),
      this.#parseAndRunControllerFunction(controllerFunction) as RouterFunction
    );

    return {
      post: this.#localParamRequest(functions, controllerFunction)
    };
  }

  /**
   * Registers a PUT route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  put<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: HttpContractDetails<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders
    >,
    ...functions: ForklaunchSchemaMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.#extractControllerFunction(functions);

    this.routes.push({
      basePath: this.basePath,
      path,
      method: 'PUT',
      contractDetails
    });

    this.internal.put(
      path,
      ...(this.#resolveMiddlewares<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails).concat(functions) as RouterFunction[]),
      this.#parseAndRunControllerFunction(controllerFunction) as RouterFunction
    );

    return {
      put: this.#localParamRequest(functions, controllerFunction)
    };
  }

  /**
   * Registers a PATCH route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  patch<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: HttpContractDetails<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders
    >,
    ...functions: ForklaunchSchemaMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.#extractControllerFunction(functions);

    this.routes.push({
      basePath: this.basePath,
      path,
      method: 'PATCH',
      contractDetails
    });

    this.internal.patch(
      path,
      ...(this.#resolveMiddlewares<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails).concat(functions) as RouterFunction[]),
      this.#parseAndRunControllerFunction(controllerFunction) as RouterFunction
    );

    return {
      patch: this.#localParamRequest(functions, controllerFunction)
    };
  }

  /**
   * Registers a DELETE route with the specified contract details and handler functions.
   *
   * @template P - The type of request parameters.
   * @template ResBodyMap - The type of response body.
   * @template ReqBody - The type of request body.
   * @template ReqQuery - The type of request query.
   * @template LocalsObj - The type of local variables.
   * @param {string} path - The path for the route.
   * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
   * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
   * @returns {ExpressRouter} - The Express router.
   */
  delete<
    Path extends `/${string}`,
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: Path,
    contractDetails: PathParamHttpContractDetails<
      SV,
      P,
      ResBodyMap,
      ReqQuery,
      ReqHeaders,
      ResHeaders
    >,
    ...functions: ForklaunchSchemaMiddlewareHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[]
  ) {
    const controllerFunction = this.#extractControllerFunction(functions);

    this.routes.push({
      basePath: this.basePath,
      path,
      method: 'DELETE',
      contractDetails
    });

    this.internal.delete(
      path,
      ...(this.#resolveMiddlewares<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails).concat(functions) as RouterFunction[]),
      this.#parseAndRunControllerFunction(controllerFunction) as RouterFunction
    );

    return {
      delete: this.#localParamRequest(functions, controllerFunction)
    };
  }
}
