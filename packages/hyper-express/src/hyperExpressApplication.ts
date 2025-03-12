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
 *
 * @template SV - A type that extends AnySchemaValidator.
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
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    schemaValidator: SV,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    private readonly docsConfiguration?: DocsConfiguration
  ) {
    super(schemaValidator, new Server(), openTelemetryCollector);
  }

  /**
   * Starts the server and sets up Swagger documentation.
   *
   * @param {string | number} arg0 - The port number or UNIX path to listen on.
   * @param {...unknown[]} args - Additional arguments.
   * @returns {Promise<uWebsockets.us_listen_socket>} - A promise that resolves with the listening socket.
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
          }) as unknown as MiddlewareHandler
        );
      } else if (this.docsConfiguration.type === 'swagger') {
        const swaggerPath = `/api/${process.env.VERSION ?? 'v1'}${process.env.DOCS_PATH ?? '/docs'}`;
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
