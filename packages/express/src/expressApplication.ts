import {
  ForklaunchExpressLikeApplication,
  ForklaunchRouter,
  generateSwaggerDocument,
  isForklaunchRouter
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import express, { ErrorRequestHandler, Express, RequestHandler } from 'express';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import { Router } from './expressRouter';

/**
 * Application class that sets up an Express server with Forklaunch routers and middleware.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export class Application<
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
    if (isForklaunchRouter<SV>(router)) {
      const expressRouter = router as Router<SV, `/${string}`>;
      this.routers.push(expressRouter);
      this.internal.use(expressRouter.basePath, expressRouter.internal);
      return this;
    } else {
      const expressRouter = args.pop() as Router<SV, `/${string}`>;
      if (!isForklaunchRouter<SV>(expressRouter)) {
        throw new Error('Last argument must be a router');
      }

      args.forEach((arg) => {
        if (isForklaunchRouter<SV>(arg)) {
          throw new Error('Only one router is allowed');
        }
      });

      this.internal.use(
        expressRouter.basePath,
        ...(args as unknown as RequestHandler[]),
        expressRouter.internal
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
        generateSwaggerDocument<SV>(this.schemaValidator, port, this.routers)
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      console.error(err);
      res.locals.errorMessage = err.message;
      res
        .status(res.statusCode && res.statusCode >= 400 ? res.statusCode : 500)
        .send(`Internal server error:\n\n${err.message}`);
    };
    this.internal.use(errorHandler);
    return this.internal.listen(...(args as (() => void)[]));
  }
}
