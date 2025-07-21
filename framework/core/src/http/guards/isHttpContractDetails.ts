import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  ExtractedParamsObject,
  HeadersObject,
  HttpContractDetails,
  HttpMethod,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods,
  VersionSchema
} from '../types/contractDetails.types';
import { isPathParamHttpContractDetails } from './isPathParamContractDetails';

/**
 * Type guard that checks if an object is an HTTP contract details object.
 * An HTTP contract details object contains the schema definitions for an HTTP endpoint,
 * including path parameters, response schemas, body schema, query parameters, and headers.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @template Path - A type that extends `/${string}` representing the endpoint path
 * @template ParamsSchema - The type of path parameters schema
 * @template ResponseSchemas - The type of response schemas
 * @template BodySchema - The type of request body schema
 * @template QuerySchema - The type of query parameters schema
 * @template ReqHeaders - The type of request headers schema
 * @template ResHeaders - The type of response headers schema
 * @template BaseRequest - The base request type
 * @param {unknown} maybeContractDetails - The object to check
 * @returns {boolean} A type predicate indicating whether the object is an HttpContractDetails
 *
 * @example
 * ```ts
 * if (isHttpContractDetails(contractDetails)) {
 *   // contractDetails is now typed as HttpContractDetails
 *   const { body, path, params } = contractDetails;
 * }
 * ```
 */
export function isHttpContractDetails<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  ParamsSchema extends ExtractedParamsObject<Path> & ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV>,
  BodySchema extends Body<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  VersionedReqs extends VersionSchema<SV, HttpMethod>,
  BaseRequest,
  const Auth extends SchemaAuthMethods<
    SV,
    ParamsSchema,
    BodySchema,
    QuerySchema,
    ReqHeaders,
    VersionedReqs,
    BaseRequest
  >
>(
  maybeContractDetails: unknown
): maybeContractDetails is HttpContractDetails<
  SV,
  Name,
  Path,
  ParamsSchema,
  ResponseSchemas,
  BodySchema,
  QuerySchema,
  ReqHeaders,
  ResHeaders,
  VersionedReqs,
  BaseRequest,
  Auth
> {
  return (
    isPathParamHttpContractDetails(maybeContractDetails) &&
    'body' in maybeContractDetails &&
    maybeContractDetails.body != null
  );
}
