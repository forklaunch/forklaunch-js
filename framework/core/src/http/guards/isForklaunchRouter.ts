import { AnySchemaValidator } from '@forklaunch/validator';
import { ForklaunchRouter } from '../types/router.types';

/**
 * Type guard that checks if an object is a Forklaunch router.
 * A Forklaunch router is an object that has a base path and an array of routes.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @param {unknown} maybeForklaunchRouter - The object to check
 * @returns {boolean} A type predicate indicating whether the object is a ForklaunchRouter
 *
 * @example
 * ```ts
 * if (isForklaunchRouter(router)) {
 *   // router is now typed as ForklaunchRouter
 *   router.basePath; // '/api'
 *   router.routes; // Route[]
 * }
 * ```
 */
export function isForklaunchRouter<SV extends AnySchemaValidator>(
  maybeForklaunchRouter: unknown
): maybeForklaunchRouter is ForklaunchRouter<SV> {
  return (
    maybeForklaunchRouter != null &&
    typeof maybeForklaunchRouter === 'object' &&
    'basePath' in maybeForklaunchRouter &&
    'routes' in maybeForklaunchRouter &&
    Array.isArray(maybeForklaunchRouter.routes)
  );
}
