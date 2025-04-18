import {
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  DocsConfiguration,
  ForklaunchExpressLikeApplication,
  generateSwaggerDocument,
  isForklaunchRequest,
  logger,
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  MiddlewareHandler,
  MiddlewareNext,
  Request,
  Response,
  Server
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
import { apiReference } from '@scalar/express-api-reference';
import * as uWebsockets from 'uWebSockets.js';
import { swagger, swaggerRedirect } from './middleware/swagger.middleware';

/**
 * Represents an application built on top of Hyper-Express and Forklaunch.
 * This class provides a high-performance web server implementation using uWebSockets.js
 * with Forklaunch's schema validation and API documentation capabilities.
 *
 * @template SV - Schema validator type extending AnySchemaValidator
 *
 * @example
 * ```typescript
 * const app = new Application(schemaValidator, openTelemetryCollector);
 *
 * app.get('/users', {
 *   responses: {
 *     200: { type: 'array', items: { type: 'object' } }
 *   }
 * }, async (req, res) => {
 *   res.json(await getUsers());
 * });
 *
 * await app.listen(3000);
 * ```
 */
export class Application<
  SV extends AnySchemaValidator
> extends ForklaunchExpressLikeApplication<
  SV,
  Server,
  MiddlewareHandler,
  Request<Record<string, unknown>>,
  Response<Record<string, unknown>>,
  MiddlewareNext
> {
  /**
   * Creates an instance of the Application class.
   *
   * @param {SV} schemaValidator - Schema validator for request/response validation
   * @param {OpenTelemetryCollector<MetricsDefinition>} openTelemetryCollector - Collector for OpenTelemetry metrics
   * @param {DocsConfiguration} [docsConfiguration] - Optional configuration for API documentation (Swagger/Scalar)
   *
   * @example
   * ```typescript
   * const app = new Application(
   *   new SchemaValidator(),
   *   new OpenTelemetryCollector(),
   *   { type: 'swagger' }
   * );
   * ```
   */
  constructor(
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    private readonly docsConfiguration?: DocsConfiguration
  ) {
    super(schemaValidator, new Server(), openTelemetryCollector);
  }

  /**
   * Starts the server and sets up API documentation.
   * Supports multiple listening configurations including port, host, and UNIX socket path.
   * Automatically sets up Swagger or Scalar documentation based on configuration.
   *
   * @param {number | string} arg0 - Port number or UNIX socket path
   * @param {string | Function} [arg1] - Host name or callback function
   * @param {Function} [arg2] - Callback function when host is specified
   * @returns {Promise<uWebsockets.us_listen_socket>} Promise resolving to the listening socket
   *
   * @example
   * ```typescript
   * // Listen on port 3000
   * await app.listen(3000);
   *
   * // Listen on specific host and port
   * await app.listen(3000, 'localhost');
   *
   * // Listen on UNIX socket
   * await app.listen('/tmp/app.sock');
   *
   * // With callback
   * await app.listen(3000, (socket) => {
   *   console.log('Server started');
   * });
   * ```
   */
  async listen(
    port: number,
    callback?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket>;
  async listen(
    port: number,
    host?: string,
    callback?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket>;
  async listen(
    unix_path: string,
    callback?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket>;
  async listen(
    arg0: number | string,
    arg1?: string | ((listen_socket: uWebsockets.us_listen_socket) => void),
    arg2?: (listen_socket: uWebsockets.us_listen_socket) => void
  ): Promise<uWebsockets.us_listen_socket> {
    if (typeof arg0 === 'number') {
      const port = arg0 || Number(process.env.PORT);

      this.internal.set_error_handler((req, res, err) => {
        res.locals.errorMessage = err.message;
        res.type('text/plain');
        res
          .status(
            res.statusCode && res.statusCode >= 400 ? res.statusCode : 500
          )
          .send(
            `Internal server error:\n\nCorrelation id: ${
              isForklaunchRequest(req)
                ? req.context.correlationId
                : 'No correlation ID'
            }`
          );
        logger('error').error(err.stack ?? err.message, {
          [ATTR_HTTP_RESPONSE_STATUS_CODE]: res.statusCode ?? 500
        });
      });

      if (
        this.docsConfiguration == null ||
        this.docsConfiguration.type === 'scalar'
      ) {
        this.internal.use(
          `/api/${process.env.VERSION ?? 'v1'}${
            process.env.DOCS_PATH ?? '/docs'
          }`,
          apiReference({
            content: generateSwaggerDocument<SV>(
              this.schemaValidator,
              port,
              this.routers
            ),
            ...this.docsConfiguration
          }) as unknown as MiddlewareHandler
        );
      } else if (this.docsConfiguration.type === 'swagger') {
        const swaggerPath = `/api/${process.env.VERSION ?? 'v1'}${
          process.env.DOCS_PATH ?? '/docs'
        }`;
        this.internal.use(swaggerPath, swaggerRedirect(swaggerPath));
        this.internal.get(
          `${swaggerPath}/*`,
          swagger(
            swaggerPath,
            generateSwaggerDocument<SV>(
              this.schemaValidator,
              port,
              this.routers
            )
          )
        );
      }

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
