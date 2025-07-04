import { EmptyObject } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { CorsOptions } from 'cors';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import { cors } from '../middleware/request/cors.middleware';
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
  NextFunction,
  FetchMap extends Record<string, unknown> = EmptyObject,
  Sdk extends Record<string, unknown> = EmptyObject,
  SdkName extends string = 'sdk'
> extends ForklaunchExpressLikeRouter<
  SV,
  '/',
  RouterHandler,
  Server,
  BaseRequest,
  BaseResponse,
  NextFunction,
  FetchMap,
  Sdk,
  SdkName
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
      sdkName?: SdkName;
    }
  ) {
    super(
      '/',
      schemaValidator,
      internal,
      postEnrichMiddleware,
      openTelemetryCollector
    );

    this.internal.use(cors(this.appOptions?.cors ?? {}) as RouterHandler);
  }

  abstract listen(...args: unknown[]): void;
}
