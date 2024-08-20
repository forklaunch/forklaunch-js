import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  ExtractedParamsObject,
  HeadersObject,
  HttpContractDetails,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';

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
  ResHeaders extends HeadersObject<SV>
>(
  contractDetails:
    | PathParamHttpContractDetails<
        SV,
        Path,
        ParamsSchema,
        ResponseSchemas,
        QuerySchema,
        ReqHeaders,
        ResHeaders
      >
    | HttpContractDetails<
        SV,
        Path,
        ParamsSchema,
        ResponseSchemas,
        BodySchema,
        QuerySchema,
        ReqHeaders,
        ResHeaders
      >
): contractDetails is HttpContractDetails<
  SV,
  Path,
  ParamsSchema,
  ResponseSchemas,
  BodySchema,
  QuerySchema,
  ReqHeaders,
  ResHeaders
> {
  return (
    (
      contractDetails as HttpContractDetails<
        SV,
        Path,
        ParamsSchema,
        ResponseSchemas,
        BodySchema,
        QuerySchema,
        ReqHeaders,
        ResHeaders
      >
    ).body !== undefined
  );
}
