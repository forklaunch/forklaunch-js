import { AnySchemaValidator } from '@forklaunch/validator';
import { Application } from './src/expressApplication';
import { Router } from './src/expressRouter';

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

export type { Application } from './src/expressApplication';
export type { Router } from './src/expressRouter';
export * from './src/types/express.types';
