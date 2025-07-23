import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import {
  ForklaunchRequest,
  VersionedRequests
} from '../types/apiDefinition.types';
import { ParamsDictionary } from '../types/contractDetails.types';

/**
 * Type guard that checks if an object is a Forklaunch request.
 * A Forklaunch request is an object that contains contract details and follows the Forklaunch request structure.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @template P - The type of route parameters that extends ParamsDictionary
 * @template ReqBody - The type of request body that extends Record<string, unknown>
 * @template ReqQuery - The type of request query parameters that extends ParsedQs
 * @template ReqHeaders - The type of request headers that extends Record<string, unknown>
 * @param {unknown} request - The object to check
 * @returns {boolean} A type predicate indicating whether the object is a ForklaunchRequest
 *
 * @example
 * ```ts
 * if (isForklaunchRequest(request)) {
 *   // request is now typed as ForklaunchRequest
 *   const { contractDetails } = request;
 * }
 * ```
 */
export function isForklaunchRequest<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, unknown>,
  VersionedReqs extends VersionedRequests
>(
  request: unknown
): request is ForklaunchRequest<
  SV,
  P,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  Extract<keyof VersionedReqs, string>
> {
  return (
    request != null &&
    typeof request === 'object' &&
    'contractDetails' in request
  );
}
