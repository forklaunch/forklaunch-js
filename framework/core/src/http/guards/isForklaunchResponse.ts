import {
  ForklaunchResponse,
  VersionedResponses
} from '../types/apiDefinition.types';

/**
 * Type guard that checks if an object is a Forklaunch response.
 * A Forklaunch response is an object that contains contract details and follows the Forklaunch response structure.
 *
 * @template BaseResponse - The base response type (e.g., Express Response)
 * @template ResBodyMap - The type mapping of status codes to response bodies
 * @template ResHeaders - The type of response headers
 * @template LocalsObj - The type of response locals
 * @template VersionedResps - The type of versioned responses
 * @param {unknown} response - The object to check
 * @returns {boolean} A type predicate indicating whether the object is a ForklaunchResponse
 *
 * @example
 * ```ts
 * if (isForklaunchResponse(response)) {
 *   // response is now typed as ForklaunchResponse
 *   const { contractDetails } = response;
 * }
 * ```
 */
export function isForklaunchResponse<
  BaseResponse,
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>,
  VersionedResps extends VersionedResponses
>(
  response: unknown
): response is ForklaunchResponse<
  BaseResponse,
  ResBodyMap,
  ResHeaders,
  LocalsObj,
  Extract<keyof VersionedResps, string>
> {
  return (
    response != null &&
    typeof response === 'object' &&
    'statusCode' in response &&
    'setHeader' in response &&
    'send' in response
  );
}
