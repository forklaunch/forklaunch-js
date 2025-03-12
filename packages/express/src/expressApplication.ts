import {
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  DocsConfiguration,
  ForklaunchExpressLikeApplication,
  generateSwaggerDocument,
  isForklaunchRequest,
  logger,
  meta,
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { apiReference } from '@scalar/express-api-reference';
import express, {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';

/**
 * Application class that sets up an Express server with Forklaunch routers and middleware.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export class Application<
  SV extends AnySchemaValidator
> extends ForklaunchExpressLikeApplication<
  SV,
  Express,
  RequestHandler,
  Request,
  Response,
  NextFunction
> {
  /**
   * Creates an instance of Application.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    private readonly docsConfiguration?: DocsConfiguration
  ) {
    super(schemaValidator, express(), openTelemetryCollector);
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

    if (
      this.docsConfiguration == null ||
      this.docsConfiguration.type === 'scalar'
    ) {
      this.internal.use(
        `/api/${process.env.VERSION ?? 'v1'}${process.env.DOCS_PATH ?? '/docs'}`,
        apiReference({
          spec: {
            content: generateSwaggerDocument<SV>(
              this.schemaValidator,
              port,
              this.routers
            )
          },
          ...this.docsConfiguration
        }) as unknown as RequestHandler
      );
    } else if (this.docsConfiguration.type === 'swagger') {
      this.internal.use(
        `/api/${process.env.VERSION ?? 'v1'}${process.env.DOCS_PATH ?? '/docs'}`,
        swaggerUi.serve,
        swaggerUi.setup(
          generateSwaggerDocument<SV>(this.schemaValidator, port, this.routers)
        )
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
      res.locals.errorMessage = err.message;
      res.type('text/plain');
      res
        .status(res.statusCode && res.statusCode >= 400 ? res.statusCode : 500)
        .send(
          `Internal server error:\n\n${isForklaunchRequest(req) ? req.context.correlationId : 'No correlation ID'}`
        );
      logger('error').error(
        err.stack ?? err.message,
        meta({
          [ATTR_HTTP_RESPONSE_STATUS_CODE]: res.statusCode ?? 500
        })
      );
    };
    this.internal.use(errorHandler);
    return this.internal.listen(...(args as (() => void)[]));
  }
}
