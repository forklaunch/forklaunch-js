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
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
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
import { contentParse } from './middleware/content.parse.middleware';
import { enrichResponseTransmission } from './middleware/enrichResponseTransmission.middleware';

/**
 * Application class that sets up an Express server with Forklaunch routers and middleware.
 * This class extends ForklaunchExpressLikeApplication to provide Express-specific functionality.
 *
 * @template SV - A type that extends AnySchemaValidator for schema validation.
 * @example
 * ```typescript
 * const app = new Application(schemaValidator, openTelemetryCollector);
 * app.listen(3000, () => console.log('Server running on port 3000'));
 * ```
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
   * @param {SV} schemaValidator - The schema validator for request/response validation.
   * @param {OpenTelemetryCollector<MetricsDefinition>} openTelemetryCollector - Collector for OpenTelemetry metrics.
   * @param {DocsConfiguration} [docsConfiguration] - Optional configuration for API documentation (Swagger/Scalar).
   */
  constructor(
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    private readonly docsConfiguration?: DocsConfiguration,
    options?: OptionsText & OptionsJson & OptionsUrlencoded
  ) {
    super(
      schemaValidator,
      express(),
      [
        contentParse<SV>(options),
        enrichResponseTransmission as unknown as RequestHandler
      ],
      openTelemetryCollector
    );
  }

  /**
   * Starts the Express server and sets up API documentation (Swagger/Scalar).
   * This method is overloaded to support various ways of starting the server.
   *
   * @param {number} [port] - The port number to listen on. Defaults to process.env.PORT.
   * @param {string} [hostname] - The hostname to bind to.
   * @param {number} [backlog] - The maximum length of the queue of pending connections.
   * @param {() => void} [callback] - Optional callback to execute when the server starts listening.
   * @returns {Server} - The HTTP server instance.
   *
   * @example
   * ```typescript
   * // Start server on port 3000
   * app.listen(3000);
   *
   * // Start server with callback
   * app.listen(3000, () => console.log('Server started'));
   *
   * // Start server with hostname and port
   * app.listen(3000, 'localhost');
   * ```
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

    const openApi = generateSwaggerDocument<SV>(
      this.schemaValidator,
      port,
      this.routers
    );

    if (
      this.docsConfiguration == null ||
      this.docsConfiguration.type === 'scalar'
    ) {
      this.internal.use(
        `/api/${process.env.VERSION ?? 'v1'}${
          process.env.DOCS_PATH ?? '/docs'
        }`,
        apiReference({
          content: openApi,
          ...this.docsConfiguration
        }) as unknown as RequestHandler
      );
    } else if (this.docsConfiguration.type === 'swagger') {
      this.internal.use(
        `/api/${process.env.VERSION ?? 'v1'}${
          process.env.DOCS_PATH ?? '/docs'
        }`,
        swaggerUi.serve,
        swaggerUi.setup(openApi)
      );
    }

    this.internal.get(
      `/api/${process.env.VERSION ?? 'v1'}${
        process.env.DOCS_PATH ?? '/openapi'
      }`,
      (_, res) => {
        res.json(openApi);
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
      const statusCode = Number(res.statusCode);
      res.locals.errorMessage = err.message;
      res.type('text/plain');
      res
        .status(statusCode >= 400 ? statusCode : 500)
        .send(
          `Internal server error:\n\nCorrelation id: ${
            isForklaunchRequest(req)
              ? req.context.correlationId
              : 'No correlation ID'
          }`
        );
      logger('error').error(
        err.stack ?? err.message,
        meta({
          [ATTR_HTTP_RESPONSE_STATUS_CODE]: statusCode
        })
      );
    };
    this.internal.use(errorHandler);
    return this.internal.listen(...(args as (() => void)[]));
  }
}
