import {
  Body,
  ForklaunchRoute,
  ForklaunchRouter,
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
import { enrichResponseTransmission } from './middleware/response.middleware';
import { swagger, swaggerRedirect } from './middleware/swagger.middleware';
import {
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
  internal = new Server();
  private routers: Router<SV>[] = [];

  /**
   * Creates an instance of the Application class.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(private schemaValidator: SV) { }

  /**
   * Registers middleware or routers to the application.
   *
   * @param {(string | Router<SV> | MiddlewareHandler | MiddlewareHandler[])[]} args - The middleware or routers to register.
   * @returns {this} - The application instance.
   */
  use(
    router: Router<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[],
    ...args: (Router<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[])[]
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
        router.basePath,
        ...(args as unknown as (
          | ExpressMiddlewareHandler
          | ExpressMiddlewareHandler[]
        )[]),
        router.internal
      );
      return this;
    }
    // const newArgs = args.map((arg) => {
    //   if (arg instanceof Router) {
    //     this.routers.push(arg);
    //     return arg.internal;
    //   }
    //   return arg;
    // });
    // this.internal.use(...(newArgs as UsableSpreadableArguments));
    // return this;
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
export class Router<SV extends AnySchemaValidator>
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
    public basePath: string,
    private schemaValidator: SV
  ) {
    this.internal.use(contentParse());
    this.internal.use(
      createRequestContext(
        this.schemaValidator
      ) as unknown as ExpressMiddlewareHandler
    );
    this.internal.use(
      enrichResponseTransmission as unknown as ExpressMiddlewareHandler
    );
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
    const middlewares = [enrichRequestDetails(contractDetails)];
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
    LocalsObj extends Record<string, unknown> = Record<string, unknown>,
    StatusCode extends number = number
  >(
    requestHandler: MiddlewareHandler<
      SV,
      P,
      ResBody | string,
      ReqBody,
      ReqQuery,
      LocalsObj,
      StatusCode
    >
  ): MiddlewareHandler<
    SV,
    P,
    ResBody | string,
    ReqBody,
    ReqQuery,
    LocalsObj,
    StatusCode
  > {
    return async (
      req: Request<SV, P, ReqBody, ReqQuery, LocalsObj>,
      res: Response<ResBody | string, LocalsObj, StatusCode>,
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
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    functions: MiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]
  ): MiddlewareHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj> {
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
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: string,
    contractDetails: PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      LocalsObj
    >[]
  ): ExpressRouter {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'get',
      contractDetails
    });

    return this.internal.get(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );
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
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: string,
    contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      LocalsObj
    >[]
  ): ExpressRouter {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'post',
      contractDetails
    });

    return this.internal.post(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );
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
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: string,
    contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      LocalsObj
    >[]
  ): ExpressRouter {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'put',
      contractDetails
    });

    return this.internal.put(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );
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
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: string,
    contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      LocalsObj
    >[]
  ): ExpressRouter {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'patch',
      contractDetails
    });

    return this.internal.patch(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );
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
    P extends ParamsObject<SV> = ParamsObject<SV>,
    ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
    ReqBody extends Body<SV> = Body<SV>,
    ReqQuery extends QueryObject<SV> = QueryObject<SV>,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>
  >(
    path: string,
    contractDetails: PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>,
    ...functions: SchemaMiddlewareHandler<
      SV,
      P,
      ResBody,
      ReqBody,
      ReqQuery,
      LocalsObj
    >[]
  ): ExpressRouter {
    const controllerFunction = this.extractControllerFunction(functions);
    const sdkPath = this.extractSdkPath(path);

    this.routes.push({
      basePath: this.basePath,
      path,
      sdkPath,
      method: 'delete',
      contractDetails
    });

    return this.internal.delete(
      path,
      ...(functions.concat(
        this.resolveMiddlewares(contractDetails) as typeof functions
      ) as unknown as ExpressMiddlewareHandler[]),
      this.parseAndRunControllerFunction(
        controllerFunction
      ) as unknown as ExpressMiddlewareHandler
    );
  }

  /**
   * Handles the incoming request.
   *
   * @param {Request<SV>} req - The request object.
   * @param {Response} res - The response object.
   * @param {MiddlewareNext} out - The next middleware function.
   */
  // handle(req: Request<SV>, res: Response, out: MiddlewareNext) {
  //     this.internal(req, res, out);
  // }
}

/**
 * Creates a new instance of Router with the given base path and schema validator.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {string} basePath - The base path for the router.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Router<SV>} - The new router instance.
 */
export function forklaunchRouter<SV extends AnySchemaValidator>(
  basePath: `/${string}`,
  schemaValidator: SV
): Router<SV> {
  const router = new Router(basePath, schemaValidator);
  return router;
}
