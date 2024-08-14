import {
  ForklaunchExpressLikeApplication,
  ForklaunchExpressLikeRouter,
  ForklaunchRouter,
  generateSwaggerDocument
} from '@forklaunch/core';
import { AnySchemaValidator } from '@forklaunch/validator';
import express, {
  ErrorRequestHandler,
  Express,
  Router as ExpressRouter,
  RequestHandler
} from 'express';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import { enrichResponseTransmission } from './middleware/response.middleware';

/**
 * Application class that sets up an Express server with Forklaunch routers and middleware.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
class Application<
  SV extends AnySchemaValidator
> extends ForklaunchExpressLikeApplication<SV, Express> {
  /**
   * Creates an instance of Application.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(schemaValidator: SV) {
    super(schemaValidator, express());
  }

  //TODO: change this to different signatures and handle different cases
  /**
   * Registers middleware or routers to the application.
   *
   * @param {...(ForklaunchRouter<SV> | RequestHandler)[]} args - The middleware or routers to register.
   * @returns {this} - The application instance.
   */
  use(
    router: ForklaunchRouter<SV> | RequestHandler,
    ...args: (ForklaunchRouter<SV> | RequestHandler)[]
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
        ...(args as unknown as RequestHandler[]),
        router.internal
      );
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      res.locals.errorMessage = err.message;
      res
        .status(res.statusCode && res.statusCode >= 400 ? res.statusCode : 500)
        .send(`Internal server error:\n\n${err.message}`);
    };
    this.internal.use(errorHandler);
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
export function forklaunchExpress<SV extends AnySchemaValidator>(
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
class Router<SV extends AnySchemaValidator, BasePath extends `/${string}`>
  extends ForklaunchExpressLikeRouter<
    SV,
    BasePath,
    RequestHandler,
    ExpressRouter
  >
  implements ForklaunchRouter<SV>
{
  /**
   * Creates an instance of Router.
   *
   * @param {string} basePath - The base path for the router.
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    public basePath: BasePath,
    schemaValidator: SV
  ) {
    super(basePath, schemaValidator, express.Router());

    this.internal.use(express.json());
    this.internal.use(enrichResponseTransmission as unknown as RequestHandler);
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
export function forklaunchRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`
>(basePath: BasePath, schemaValidator: SV): Router<SV, BasePath> {
  const router = new Router(basePath, schemaValidator);
  return router;
}
