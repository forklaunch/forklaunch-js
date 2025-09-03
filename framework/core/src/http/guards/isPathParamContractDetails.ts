import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  ExtractedParamsObject,
  HeadersObject,
  ParamsObject,
  PathParamHttpContractDetails,
  PathParamMethod,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods,
  VersionSchema
} from '../types/contractDetails.types';

export function isPathParamHttpContractDetails<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  ParamsSchema extends ExtractedParamsObject<Path> & ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV>,
  BodySchema extends Body<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  VersionedApi extends VersionSchema<SV, PathParamMethod>,
  SessionSchema extends Record<string, unknown>,
  BaseRequest,
  const Auth extends SchemaAuthMethods<
    SV,
    ParamsSchema,
    BodySchema,
    QuerySchema,
    ReqHeaders,
    VersionedApi,
    SessionSchema,
    BaseRequest
  >
>(
  maybePathParamHttpContractDetails: unknown
): maybePathParamHttpContractDetails is PathParamHttpContractDetails<
  SV,
  Name,
  Path,
  ParamsSchema,
  ResponseSchemas,
  BodySchema,
  QuerySchema,
  ReqHeaders,
  ResHeaders,
  VersionedApi,
  SessionSchema,
  BaseRequest,
  Auth
> {
  return (
    maybePathParamHttpContractDetails != null &&
    typeof maybePathParamHttpContractDetails === 'object' &&
    'name' in maybePathParamHttpContractDetails &&
    'summary' in maybePathParamHttpContractDetails &&
    maybePathParamHttpContractDetails.name != null &&
    maybePathParamHttpContractDetails.summary != null &&
    (('responses' in maybePathParamHttpContractDetails &&
      maybePathParamHttpContractDetails.responses != null) ||
      ('versions' in maybePathParamHttpContractDetails &&
        typeof maybePathParamHttpContractDetails.versions === 'object' &&
        maybePathParamHttpContractDetails.versions != null &&
        Object.values(maybePathParamHttpContractDetails.versions).every(
          (version) => 'responses' in version && version.responses != null
        )))
  );
}
