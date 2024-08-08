import {
  ForklaunchExpressLikeApplication,
  ForklaunchExpressLikeRouter,
  ForklaunchRouter,
  createRequestContext,
  generateSwaggerDocument
} from '@forklaunch/core';
import {
  Router as ExpressRouter,
  MiddlewareHandler,
  Server
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
import * as uWebsockets from 'uWebSockets.js';
import { contentParse } from './middleware/contentParse.middleware';
import { polyfillGetHeaders } from './middleware/polyfillGetHeaders.middleware';
import {
  corsMiddleware,
  enrichResponseTransmission
} from './middleware/response.middleware';
import { swagger, swaggerRedirect } from './middleware/swagger.middleware';

/**
 * Represents an application built on top of Hyper-Express and Forklaunch.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
class Application<
  SV extends AnySchemaValidator
> extends ForklaunchExpressLikeApplication<SV, Server> {
  /**
   * Creates an instance of the Application class.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(schemaValidator: SV) {
    super(schemaValidator, new Server());
  }

  /**
   * Registers middleware or routers to the application.
   *
   * @param {ForklaunchRouter<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[]} router - The router or middleware to register.
   * @param {...(ForklaunchRouter<SV> | MiddlewareHandler<SV> | MiddlewareHandler<SV>[])} args - Additional arguments.
   * @returns {this} - The application instance.
   */
  use(
    router: ForklaunchRouter<SV> | MiddlewareHandler | MiddlewareHandler[],
    ...args: (ForklaunchRouter<SV> | MiddlewareHandler | MiddlewareHandler[])[]
  ): this {
    if (router instanceof Router) {
      this.routers.push(router as unknown as Router<SV, `/${string}`>);
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
        ...(args as unknown as (MiddlewareHandler | MiddlewareHandler[])[]),
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

export type App<SV extends AnySchemaValidator> = Application<SV>;

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

class Router<SV extends AnySchemaValidator, BasePath extends `/${string}`>
  extends ForklaunchExpressLikeRouter<
    SV,
    BasePath,
    MiddlewareHandler,
    ExpressRouter
  >
  implements ForklaunchRouter<SV>
{
  constructor(
    public basePath: BasePath,
    public schemaValidator: SV
  ) {
    super(basePath, new ExpressRouter());

    this.internal.use(polyfillGetHeaders);
    this.internal.use(contentParse);
    this.internal.use(
      createRequestContext(this.schemaValidator) as unknown as MiddlewareHandler
    );
    this.internal.use(corsMiddleware as unknown as MiddlewareHandler);
    this.internal.use(
      enrichResponseTransmission as unknown as MiddlewareHandler
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
export function forklaunchRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`
>(basePath: BasePath, schemaValidator: SV): Router<SV, BasePath> {
  const router = new Router(basePath, schemaValidator);
  return router;
}
