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
import { AnySchemaValidator } from '@forklaunch/validator';
import express, {
    Request as ExpressRequest,
    RequestHandler as ExpressRequestHandler,
    Response as ExpressResponse,
    Router as ExpressRouter,
    NextFunction
} from 'express';
import { Server } from 'http';
import { ParsedQs } from 'qs';
import swaggerUi from 'swagger-ui-express';
import { asyncMiddleware } from './middleware/async.middleware';
import { enrichResponseTransmission } from './middleware/response.middleware';
import {
    Request,
    RequestHandler,
    Response,
    SchemaRequestHandler
} from './types/forklaunch.express.types';

/**
 * Application class that sets up an Express server with Forklaunch routers and middleware.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export class Application<SV extends AnySchemaValidator> {
    internal = express();
    private routers: Router<SV>[] = [];

    /**
     * Creates an instance of Application.
     *
     * @param {SV} schemaValidator - The schema validator.
     */
    constructor(private schemaValidator: SV) { }

    //TODO: change this to different signatures and handle different cases
    /**
     * Registers middleware or routers to the application.
     *
     * @param {...(Router<SV> | RequestHandler<SV>)[]} args - The middleware or routers to register.
     * @returns {this} - The application instance.
     */
    use(router: (Router<SV> | RequestHandler<SV>), ...args: (Router<SV> | RequestHandler<SV>)[]): this {
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

            this.internal.use(router.basePath, ...args as unknown as ExpressRequestHandler[], router.internal);
            return this;
        }
    }

    /**
     * Starts the server and sets up Swagger documentation.
     *
     * @param {...unknown[]} args - The arguments to pass to the listen method.
     * @returns {Server} - The HTTP server.
     */
    listen(
        port: number,
        hostname: string,
        backlog: number,
        callback?: () => void
    ): Server;
    listen(port: number, hostname: string, callback?: () => void): Server;
    listen(port: number, callback?: () => void): Server;
    listen(callback?: () => void): Server;
    listen(path: string, callback?: () => void): Server;
    listen(handle: unknown, listeningListener?: () => void): Server;
    listen(...args: unknown[]): Server {
        const port =
            typeof args[0] === 'number' ? args[0] : Number(process.env.PORT);
        this.internal.use(
            `/api${process.env.VERSION ?? '/v1'}${process.env.SWAGGER_PATH ?? '/swagger'}`,
            swaggerUi.serve,
            swaggerUi.setup(
                generateSwaggerDocument(this.schemaValidator, port, this.routers)
            )
        );
        return this.internal.listen(...(args as (() => void)[]));
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
 * Router class that sets up routes and middleware for an Express router.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @implements {ForklaunchRouter<SV>}
 */
export class Router<SV extends AnySchemaValidator>
    implements ForklaunchRouter<SV>
{
    readonly routes: ForklaunchRoute<SV>[] = [];
    readonly internal: ExpressRouter = ExpressRouter();

    /**
     * Creates an instance of Router.
     *
     * @param {string} basePath - The base path for the router.
     * @param {SV} schemaValidator - The schema validator.
     */
    constructor(
        public basePath: `/${string}`,
        public schemaValidator: SV
    ) {
        this.internal.use(express.json());
        this.internal.use(
            createRequestContext(schemaValidator) as unknown as ExpressRequestHandler
        );
        this.internal.use(
            enrichResponseTransmission as unknown as ExpressRequestHandler
        );
    }

    /**
     * Resolves middlewares based on the contract details.
     *
     * @param {PathParamHttpContractDetails<SV> | HttpContractDetails<SV>} contractDetails - The contract details.
     * @returns {RequestHandler<SV>[]} - The resolved middlewares.
     */
    private resolveMiddlewares(contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>) {
        const middlewares: RequestHandler<SV>[] = [
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
            middlewares.push(asyncMiddleware(parseRequestAuth));
        }
        return middlewares;
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
     * @param {RequestHandler<SV, P, ResBody | string, ReqBody, ReqQuery, LocalsObj, StatusCode>} requestHandler - The request handler.
     * @returns {ExpressRequestHandler} - The Express request handler.
     */
    private parseAndRunControllerFunction<
        P = ParamsDictionary,
        ResBody = unknown,
        ReqBody = unknown,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>,
        StatusCode extends number = number
    >(
        requestHandler: RequestHandler<
            SV,
            P,
            ResBody | string,
            ReqBody,
            ReqQuery,
            LocalsObj,
            StatusCode
        >
    ): RequestHandler<
        SV,
        P,
        ResBody | string,
        ReqBody,
        ReqQuery,
        LocalsObj,
        StatusCode
    > {
        return async (
            req: Request<SV, P, ResBody | string, ReqBody, ReqQuery, LocalsObj>,
            res: Response<ResBody | string, LocalsObj, StatusCode>,
            next?: NextFunction
        ) => {
            if (!requestHandler) {
                throw new Error('Controller function is not defined');
            }

            try {
                // TODO: Add support for transactions
                await requestHandler(req, res, next);
            } catch (error) {
                if (next) {
                    next(error);
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
     * @template StatusCode - The type of status code.
     * @param {RequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj, StatusCode>[]} functions - The provided functions.
     * @returns {RequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj, StatusCode>} - The extracted controller function.
     * @throws {Error} - Throws an error if the last argument is not a function.
     */
    private extractControllerFunction<
        P = ParamsDictionary,
        ResBody = unknown,
        ReqBody = unknown,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>,
        StatusCode extends number = number
    >(
        functions: RequestHandler<
            SV,
            P,
            ResBody,
            ReqBody,
            ReqQuery,
            LocalsObj,
            StatusCode
        >[]
    ): RequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj, StatusCode> {
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
        this.internal.use(...(args as ExpressRequestHandler[]));
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
     * @param {string | RegExp | (string | RegExp)[]} path - The path for the route.
     * @param {PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>} contractDetails - The contract details.
     * @param {...SchemaRequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
     */
    get<
        P extends ParamsObject<SV> = ParamsObject<SV>,
        ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
        ReqBody extends Body<SV> = Body<SV>,
        ReqQuery extends QueryObject<SV> = QueryObject<SV>,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>
    >(
        path: string | RegExp | (string | RegExp)[],
        contractDetails: PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>,
        ...functions: SchemaRequestHandler<
            SV,
            P,
            ResBody,
            ReqBody,
            ReqQuery,
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
                this.resolveMiddlewares(contractDetails) as typeof functions
            ) as unknown as ExpressRequestHandler[]),
            this.parseAndRunControllerFunction(
                controllerFunction
            ) as unknown as ExpressRequestHandler
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
     * @param {string | RegExp | (string | RegExp)[]} path - The path for the route.
     * @param {HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>} contractDetails - The contract details.
     * @param {...SchemaRequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
     */
    post<
        P extends ParamsObject<SV> = ParamsObject<SV>,
        ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
        ReqBody extends Body<SV> = Body<SV>,
        ReqQuery extends QueryObject<SV> = QueryObject<SV>,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>
    >(
        path: string | RegExp | (string | RegExp)[],
        contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>,
        ...functions: SchemaRequestHandler<
            SV,
            P,
            ResBody,
            ReqBody,
            ReqQuery,
            LocalsObj
        >[]
    ) {
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
                this.resolveMiddlewares(contractDetails) as typeof functions
            ) as unknown as ExpressRequestHandler[]),
            this.parseAndRunControllerFunction(
                controllerFunction
            ) as unknown as ExpressRequestHandler
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
     * @param {string | RegExp | (string | RegExp)[]} path - The path for the route.
     * @param {HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>} contractDetails - The contract details.
     * @param {...SchemaRequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
     */
    put<
        P extends ParamsObject<SV> = ParamsObject<SV>,
        ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
        ReqBody extends Body<SV> = Body<SV>,
        ReqQuery extends QueryObject<SV> = QueryObject<SV>,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>
    >(
        path: string | RegExp | (string | RegExp)[],
        contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>,
        ...functions: SchemaRequestHandler<
            SV,
            P,
            ResBody,
            ReqBody,
            ReqQuery,
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
                this.resolveMiddlewares(contractDetails) as typeof functions
            ) as unknown as ExpressRequestHandler[]),
            this.parseAndRunControllerFunction(
                controllerFunction
            ) as unknown as ExpressRequestHandler
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
     * @param {string | RegExp | (string | RegExp)[]} path - The path for the route.
     * @param {HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>} contractDetails - The contract details.
     * @param {...SchemaRequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
     */
    patch<
        P extends ParamsObject<SV> = ParamsObject<SV>,
        ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
        ReqBody extends Body<SV> = Body<SV>,
        ReqQuery extends QueryObject<SV> = QueryObject<SV>,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>
    >(
        path: string | RegExp | (string | RegExp)[],
        contractDetails: HttpContractDetails<SV, P, ResBody, ReqBody, ReqQuery>,
        ...functions: SchemaRequestHandler<
            SV,
            P,
            ResBody,
            ReqBody,
            ReqQuery,
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
                this.resolveMiddlewares(contractDetails) as typeof functions
            ) as unknown as ExpressRequestHandler[]),
            this.parseAndRunControllerFunction(
                controllerFunction
            ) as unknown as ExpressRequestHandler
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
     * @param {string | RegExp | (string | RegExp)[]} path - The path for the route.
     * @param {PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>} contractDetails - The contract details.
     * @param {...SchemaRequestHandler<SV, P, ResBody, ReqBody, ReqQuery, LocalsObj>[]} functions - The handler functions.
     */
    delete<
        P extends ParamsObject<SV> = ParamsObject<SV>,
        ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
        ReqBody extends Body<SV> = Body<SV>,
        ReqQuery extends QueryObject<SV> = QueryObject<SV>,
        LocalsObj extends Record<string, unknown> = Record<string, unknown>
    >(
        path: string | RegExp | (string | RegExp)[],
        contractDetails: PathParamHttpContractDetails<SV, P, ResBody, ReqQuery>,
        ...functions: SchemaRequestHandler<
            SV,
            P,
            ResBody,
            ReqBody,
            ReqQuery,
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
                this.resolveMiddlewares(contractDetails) as typeof functions
            ) as unknown as ExpressRequestHandler[]),
            this.parseAndRunControllerFunction(
                controllerFunction
            ) as unknown as ExpressRequestHandler
        );
    }

    /**
     * Handles the incoming request.
     *
     * @param {Request<SV>} req - The request object.
     * @param {Response} res - The response object.
     * @param {NextFunction} out - The next middleware function.
     */
    handle(req: Request<SV>, res: Response, out: NextFunction) {
        this.internal(
            req as ExpressRequest,
            res as unknown as ExpressResponse,
            out
        );
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
export function forklaunchRouter<SV extends AnySchemaValidator>(
    basePath: `/${string}`,
    schemaValidator: SV
): Router<SV> {
    const router = new Router(basePath, schemaValidator);
    return router;
}
