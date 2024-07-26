import { AnySchemaValidator } from '@forklaunch/validator';
import { ForklaunchRouter } from '../types';

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
