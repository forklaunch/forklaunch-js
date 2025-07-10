import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  ExtractedParamsObject,
  HeadersObject,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods
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
  BaseRequest,
  const Auth extends SchemaAuthMethods<
    SV,
    ParamsSchema,
    BodySchema,
    QuerySchema,
    ReqHeaders,
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
  BaseRequest,
  Auth
> {
  return (
    maybePathParamHttpContractDetails != null &&
    typeof maybePathParamHttpContractDetails === 'object' &&
    'name' in maybePathParamHttpContractDetails &&
    'summary' in maybePathParamHttpContractDetails &&
    'responses' in maybePathParamHttpContractDetails &&
    maybePathParamHttpContractDetails.name != null &&
    maybePathParamHttpContractDetails.summary != null &&
    maybePathParamHttpContractDetails.responses != null
  );
}
