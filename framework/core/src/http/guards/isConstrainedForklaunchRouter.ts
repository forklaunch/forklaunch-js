import { AnySchemaValidator } from '@forklaunch/validator';
import { ConstrainedForklaunchRouter } from '../types/router.types';
import { isForklaunchRouter } from './isForklaunchRouter';

/**
 * Type guard that checks if an object is a constrained Forklaunch router.
 * A constrained router is one that has both the basic router properties and a request handler.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @template RouterHandler - The type of the router handler
 * @param maybeForklaunchExpressLikeRouter - The object to check
 * @returns A type predicate indicating whether the object is a ConstrainedForklaunchRouter
 *
 * @example
 * ```ts
 * if (isConstrainedForklaunchRouter(router)) {
 *   // router is now typed as ConstrainedForklaunchRouter
 *   router.requestHandler(...);
 * }
 * ```
 */
export function isConstrainedForklaunchRouter<
  SV extends AnySchemaValidator,
  RouterHandler
>(
  maybeForklaunchExpressLikeRouter: unknown
): maybeForklaunchExpressLikeRouter is ConstrainedForklaunchRouter<
  SV,
  RouterHandler
> {
  return (
    isForklaunchRouter<SV>(maybeForklaunchExpressLikeRouter) &&
    'requestHandler' in maybeForklaunchExpressLikeRouter
  );
}
