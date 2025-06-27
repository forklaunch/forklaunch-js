import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import { ForklaunchExpressLikeRouter } from '../router/expressLikeRouter';
import { isConstrainedForklaunchRouter } from './isConstrainedForklaunchRouter';

/**
 * Type guard that checks if an object is a Forklaunch Express-like router.
 * A Forklaunch Express-like router is a constrained router that has both a base path and an internal router.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @template Path - A type that extends `/${string}` representing the base path
 * @template RouterHandler - The type of the router handler
 * @template Internal - The type of the internal router that extends ExpressLikeRouter
 * @template BaseRequest - The base request type
 * @template BaseResponse - The base response type
 * @template NextFunction - The type of next function
 * @param {unknown} maybeForklaunchExpressLikeRouter - The object to check
 * @returns {boolean} A type predicate indicating whether the object is a ForklaunchExpressLikeRouter
 *
 * @example
 * ```ts
 * if (isForklaunchExpressLikeRouter(router)) {
 *   // router is now typed as ForklaunchExpressLikeRouter
 *   router.basePath; // '/api'
 *   router.internal; // ExpressLikeRouter
 * }
 * ```
 */
export function isForklaunchExpressLikeRouter<
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  RouterHandler,
  Internal extends ExpressLikeRouter<RouterHandler, Internal>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  FetchMap extends Record<never, never>,
  Sdk extends Record<never, never>,
  SdkName extends string
>(
  maybeForklaunchExpressLikeRouter: unknown
): maybeForklaunchExpressLikeRouter is ForklaunchExpressLikeRouter<
  SV,
  Path,
  RouterHandler,
  Internal,
  BaseRequest,
  BaseResponse,
  NextFunction,
  FetchMap,
  Sdk,
  SdkName
> {
  return (
    isConstrainedForklaunchRouter<SV, RouterHandler>(
      maybeForklaunchExpressLikeRouter
    ) &&
    'basePath' in maybeForklaunchExpressLikeRouter &&
    'internal' in maybeForklaunchExpressLikeRouter
  );
}
