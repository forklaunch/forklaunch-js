import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import {
  date,
  number,
  string,
  SchemaValidator as TSchemaValidator
} from '@forklaunch/validator/typebox';
import { ParsedQs } from 'qs';
import { isHttpContractDetails } from '../guards/isHttpContractDetails';
import { isTypedHandler } from '../guards/isTypedHandler';
import { typedHandler } from '../handlers/typedHandler';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import { cors } from '../middleware/request/cors.middleware';
import { createContext } from '../middleware/request/createContext.middleware';
import { enrichDetails } from '../middleware/request/enrichDetails.middleware';
import { parse } from '../middleware/request/parse.middleware';
import {
  ExpressLikeSchemaMiddlewareHandler,
  ForklaunchMiddlewareHandler,
  LiveTypeFunction
} from '../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  Method,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponseCompiledSchema,
  ResponsesObject
} from '../types/contractDetails.types';
import {
  ContractDetailsOrMiddlewareOrTypedHandler,
  LiveTypeRouteDefinition,
  MiddlewareOrMiddlewareWithTypedHandler
} from '../types/expressLikeRouter.types';
import { ForklaunchRoute } from '../types/router.types';

/**
 * A class that represents an Express-like router.
 */
export class ForklaunchExpressLikeRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`,
  RouterFunction,
  Internal extends ExpressLikeRouter<RouterFunction>
> {
  readonly routes: ForklaunchRoute<SV>[] = [];
  readonly basePath: BasePath;

  constructor(
    basePath: BasePath,
    readonly schemaValidator: SV,
    readonly internal: Internal
  ) {
    this.basePath = basePath;

    this.internal.use(createContext(this.schemaValidator) as RouterFunction);
    this.internal.use(cors as RouterFunction);
  }

  /**
   * Resolves middlewares based on the contract details.
   *
   * @param {PathParamHttpContractDetails<SV> | HttpContractDetails<SV>} contractDetails - The contract details.
   * @returns {MiddlewareHandler<SV>[]} - The resolved middlewares.
   */
  #resolveMiddlewares<
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
    >,
    requestSchema: unknown,
    responseSchemas: ResponseCompiledSchema
  ): ExpressLikeSchemaMiddlewareHandler<
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
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj
      >(contractDetails, requestSchema, responseSchemas),
      parse
    ];
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
    return async (req, res, next) => {
      if (!requestHandler) {
        throw new Error('Controller function is not defined');
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
      ...contractDetails.responses
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
   * @param functions {ForklaunchMiddlewareHandler<SV>}
   * @param controllerFunction
   * @returns
   */
  #localParamRequest<Middleware>(
    functions: Middleware[],
    controllerFunction: Middleware
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
    };
  }

  #registerRoute<
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
    registrationFunction: ExpressLikeRouter<RouterFunction>[ContractMethod],
    contractDetailsOrMiddlewareOrTypedHandler: unknown,
    ...middlewareOrMiddlewareAndTypedHandler: unknown[]
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
    // in this case, we know that the first argument is the typedHandler. As a result, we only use defined functions
    if (isTypedHandler(contractDetailsOrMiddlewareOrTypedHandler)) {
      const { contractDetails, functions } =
        contractDetailsOrMiddlewareOrTypedHandler;
      return this.#registerRoute<
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
        registrationFunction,
        contractDetails,
        ...functions
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
    else if (
      middlewareOrMiddlewareAndTypedHandler.length > 0 &&
      isTypedHandler(
        middlewareOrMiddlewareAndTypedHandler[
          middlewareOrMiddlewareAndTypedHandler.length - 1
        ]
      )
    ) {
      const typedHandler = middlewareOrMiddlewareAndTypedHandler.pop();
      const { contractDetails, functions } = isTypedHandler(typedHandler)
        ? typedHandler
        : {
            contractDetails: null,
            functions: null
          };
      const bespokeMiddleware = middlewareOrMiddlewareAndTypedHandler;
      return this.#registerRoute<
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
        registrationFunction,
        contractDetails,
        ...bespokeMiddleware.concat(functions)
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
      const contractDetails =
        contractDetailsOrMiddlewareOrTypedHandler as ContractDetails<
          SV,
          ContractMethod,
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders
        >;
      const functions =
        middlewareOrMiddlewareAndTypedHandler as ExpressLikeSchemaMiddlewareHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj
        >[];

      this.routes.push({
        basePath: this.basePath,
        path,
        method,
        contractDetails
      });

      const { requestSchema, responseSchemas } = this.#compile(contractDetails);

      const controllerFunction = this.#extractControllerFunction(functions);

      registrationFunction.bind(this.internal)(
        path,
        ...(this.#resolveMiddlewares<
          ContractMethod,
          Path,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj
        >(contractDetails, requestSchema, responseSchemas).concat(
          functions
        ) as RouterFunction[]),
        this.#parseAndRunControllerFunction(
          controllerFunction
        ) as RouterFunction
      );

      return this.#localParamRequest(
        functions,
        controllerFunction
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

  // /**
  //  * Registers a GET route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // get<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | PathParamHttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'get',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     get: this.#registerRoute<
  //       'get',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'get',
  //       path,
  //       this.internal.get,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // all<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   contractDetailsOrFunction: TypedHandler<
  //     SV,
  //     'post',
  //     Path,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >,
  //   ...functions: TypedHandler<
  //     SV,
  //     'post',
  //     Path,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ): this;
  // all<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   contractDetailsOrFunction:
  //     | HttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | ExpressLikeSchemaMiddlewareHandler<
  //         SV,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   if (contractDetailsOrFunction) {
  //   }
  //   const allMiddleware = Array.isArray(contractDetailsOrTypedHandlerOrHandler)
  //     ? contractDetailsOrTypedHandlerOrHandlers
  //     : functions;
  //   this.internal.all(functions as RouterFunction[]);
  //   return this;
  // }

  // /**
  //  * Registers a POST route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // post<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | HttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'post',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     post: this.#registerRoute<
  //       'post',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'post',
  //       path,
  //       this.internal.post,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // /**
  //  * Registers a PUT route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // put<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | HttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'put',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     put: this.#registerRoute<
  //       'put',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'put',
  //       path,
  //       this.internal.put,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // /**
  //  * Registers a PATCH route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {HttpContractDetails<SV, P, ResBodyMap, ReqBody, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // patch<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | HttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'patch',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     patch: this.#registerRoute<
  //       'patch',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'patch',
  //       path,
  //       this.internal.patch,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // /**
  //  * Registers a DELETE route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // delete<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | PathParamHttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'delete',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     delete: this.#registerRoute<
  //       'delete',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'delete',
  //       path,
  //       this.internal.delete,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // /**
  //  * Registers a OPTIONS route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // options<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | PathParamHttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'options',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     options: this.#registerRoute<
  //       'options',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'options',
  //       path,
  //       this.internal.options,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // /**
  //  * Registers a HEAD route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
  // head<
  //   Path extends `/${string}`,
  //   P extends ParamsObject<SV> = ParamsObject<SV>,
  //   ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  //   ReqBody extends Body<SV> = Body<SV>,
  //   ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  //   ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  //   LocalsObj extends Record<string, unknown> = Record<string, unknown>
  // >(
  //   path: Path,
  //   contractDetailsOrTypedHandler:
  //     | PathParamHttpContractDetails<
  //         SV,
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders
  //       >
  //     | TypedHandler<
  //         SV,
  //         'head',
  //         Path,
  //         P,
  //         ResBodyMap,
  //         ReqBody,
  //         ReqQuery,
  //         ReqHeaders,
  //         ResHeaders,
  //         LocalsObj
  //       >,
  //   ...functions: ExpressLikeSchemaMiddlewareHandler<
  //     SV,
  //     P,
  //     ResBodyMap,
  //     ReqBody,
  //     ReqQuery,
  //     ReqHeaders,
  //     ResHeaders,
  //     LocalsObj
  //   >[]
  // ) {
  //   return {
  //     head: this.#registerRoute<
  //       'head',
  //       Path,
  //       P,
  //       ResBodyMap,
  //       ReqBody,
  //       ReqQuery,
  //       ReqHeaders,
  //       ResHeaders,
  //       LocalsObj
  //     >(
  //       'head',
  //       path,
  //       this.internal.head,
  //       contractDetailsOrTypedHandler,
  //       ...functions
  //     )
  //   };
  // }

  // /**
  //  * Registers a TRACE route with the specified contract details and handler functions.
  //  *
  //  * @template P - The type of request parameters.
  //  * @template ResBodyMap - The type of response body.
  //  * @template ReqBody - The type of request body.
  //  * @template ReqQuery - The type of request query.
  //  * @template LocalsObj - The type of local variables.
  //  * @param {string} path - The path for the route.
  //  * @param {PathParamHttpContractDetails<SV, P, ResBodyMap, ReqQuery>} contractDetails - The contract details.
  //  * @param {...SchemaMiddlewareHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
  //  * @returns {ExpressRouter} - The Express router.
  //  */
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
    >
  ) => {
    return {
      trace: this.#registerRoute<
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

  head: LiveTypeRouteDefinition<SV, BasePath, 'head'> = (path, one, two) => {
    const x = this.#registerRoute('head', path, this.internal.head, one, two);
  };
}

// Test case code -- move out and clean up

const xasd = typedHandler(
  TSchemaValidator(),
  '/test/:name/:id',
  {
    name: 'string',
    summary: 'string',
    params: {
      name: string,
      id: number
    },
    requestHeaders: {
      'x-test': number
    },
    responses: {
      200: date,
      400: string
    }
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.status(200).send(new Date());
  }
);

const xa = new ForklaunchExpressLikeRouter('/l', TSchemaValidator(), {});

xa.trace(
  '/test/:name/:id',
  {
    name: 'string',
    summary: 'string',
    params: {
      name: string,
      id: number
      // a: string
    },
    requestHeaders: {
      'x-test': number
    },
    responses: {
      200: date,
      400: string
    }
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.status(200).send(new Date());
  }
);

xa.trace(
  '/test/:name/:id',
  async (req, res) => {
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.status(200).send(new Date());
  },
  xasd
);

xa.trace('/test/:name/:id', xasd);
