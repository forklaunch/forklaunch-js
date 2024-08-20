import { AnySchemaValidator } from '@forklaunch/validator';
import { ForklaunchRouter } from '../types/router.types';

/**
 * ForklaunchExpressLikeApplication class that sets up routes and middleware for an Express-like application, for use with controller/routes pattern.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Server - The server type.
 */
export abstract class ForklaunchExpressLikeApplication<
  SV extends AnySchemaValidator,
  Server
> {
  routers: ForklaunchRouter<SV>[] = [];

  /**
   * Creates an instance of the Application class.
   *
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    readonly schemaValidator: SV,
    readonly internal: Server
  ) {}

  abstract use(...args: unknown[]): this;
  abstract listen(...args: unknown[]): void;
}
