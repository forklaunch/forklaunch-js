import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  ExtractedParamsObject,
  HeadersObject,
  HttpContractDetails,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';
import { isPathParamHttpContractDetails } from './isPathParamContractDetails';

/**
 * Type guard for HttpContractDetails
 */
export function isHttpContractDetails<
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  ParamsSchema extends ExtractedParamsObject<Path> & ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV>,
  BodySchema extends Body<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  BaseRequest
>(
  maybeContractDetails: unknown
): maybeContractDetails is HttpContractDetails<
  SV,
  Path,
  ParamsSchema,
  ResponseSchemas,
  BodySchema,
  QuerySchema,
  ReqHeaders,
  ResHeaders,
  BaseRequest
> {
  return (
    isPathParamHttpContractDetails(maybeContractDetails) &&
    'body' in maybeContractDetails &&
    maybeContractDetails.body != null
  );
}
