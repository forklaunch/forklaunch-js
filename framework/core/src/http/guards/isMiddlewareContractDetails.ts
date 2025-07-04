import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  ExtractedParamsObject,
  HeadersObject,
  MiddlewareContractDetails,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';

export function isMiddlewareContractDetails<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  ParamsSchema extends ExtractedParamsObject<Path> & ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV>,
  BodySchema extends Body<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  BaseRequest
>(
  contractDetails: unknown
): contractDetails is MiddlewareContractDetails<
  SV,
  Name,
  Path,
  ParamsSchema,
  ResponseSchemas,
  BodySchema,
  QuerySchema,
  ReqHeaders,
  ResHeaders,
  BaseRequest
> {
  return false;
}
