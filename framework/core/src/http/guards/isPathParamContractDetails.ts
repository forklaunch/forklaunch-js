import { AnySchemaValidator } from '@forklaunch/validator';
import {
  ExtractedParamsObject,
  HeadersObject,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';

export function isPathParamHttpContractDetails<
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  ParamsSchema extends ExtractedParamsObject<Path> & ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  BaseRequest
>(
  maybePathParamHttpContractDetails: unknown
): maybePathParamHttpContractDetails is PathParamHttpContractDetails<
  SV,
  Path,
  ParamsSchema,
  ResponseSchemas,
  QuerySchema,
  ReqHeaders,
  ResHeaders,
  BaseRequest
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
