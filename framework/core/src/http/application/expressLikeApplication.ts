import { AnySchemaValidator } from '@forklaunch/validator';
import { CorsOptions } from 'cors';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import { cors } from '../middleware/request/cors.middleware';
import { createContext } from '../middleware/request/createContext.middleware';
import { ForklaunchExpressLikeRouter } from '../router/expressLikeRouter';
import { OpenTelemetryCollector } from '../telemetry/openTelemetryCollector';
import { MetricsDefinition } from '../types/openTelemetryCollector.types';

/**
 * ForklaunchExpressLikeApplication class that sets up routes and middleware for an Express-like application, for use with controller/routes pattern.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Server - The server type.
 */
export abstract class ForklaunchExpressLikeApplication<
  SV extends AnySchemaValidator,
  Server extends ExpressLikeRouter<RouterHandler, Server>,
  RouterHandler,
  BaseRequest,
  BaseResponse,
  NextFunction
> extends ForklaunchExpressLikeRouter<
  SV,
  '/',
  RouterHandler,
  Server,
  BaseRequest,
  BaseResponse,
  NextFunction
> {
  /**
   * Creates an instance of the Application class.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    readonly schemaValidator: SV,
    readonly internal: Server,
    readonly postEnrichMiddleware: RouterHandler[],
    readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    readonly appOptions?: {
      cors?: CorsOptions;
    }
  ) {
    super(
      '/',
      schemaValidator,
      internal,
      postEnrichMiddleware,
      openTelemetryCollector
    );

    process.on('uncaughtException', (err) => {
      this.openTelemetryCollector.log('error', `Uncaught exception: ${err}`);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      this.openTelemetryCollector.log(
        'error',
        `Unhandled rejection: ${reason}`
      );
      process.exit(1);
    });
    process.on('exit', () => {
      this.openTelemetryCollector.log('info', 'Shutting down application');
    });
    process.on('SIGINT', () => {
      this.openTelemetryCollector.log('info', 'Shutting down application');
      process.exit(0);
    });

    this.internal.use(createContext(this.schemaValidator) as RouterHandler);
    this.internal.use(cors(this.appOptions?.cors ?? {}) as RouterHandler);
  }

  abstract listen(...args: unknown[]): void;
}
