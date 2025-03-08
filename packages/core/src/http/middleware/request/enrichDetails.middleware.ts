import { AnySchemaValidator } from '@forklaunch/validator';
import { ATTR_API_NAME } from '../../telemetry/constants';
import {
  ExpressLikeSchemaHandler,
  ForklaunchNextFunction
} from '../../types/apiDefinition.types';
import {
  Body,
  HeadersObject,
  HttpContractDetails,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponseCompiledSchema,
  ResponsesObject
} from '../../types/contractDetails.types';

/**
 * Middleware to enrich the request details with contract details.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {PathParamHttpContractDetails<SV> | HttpContractDetails<SV>} contractDetails - The contract details.
 * @returns {Function} - Middleware function to enrich request details.
 */
export function enrichDetails<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  path: string,
  contractDetails: HttpContractDetails<SV> | PathParamHttpContractDetails<SV>,
  requestSchema: unknown,
  responseSchemas: ResponseCompiledSchema
): ExpressLikeSchemaHandler<
  SV,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj,
  unknown,
  unknown,
  ForklaunchNextFunction
> {
  return (req, res, next?) => {
    req.originalPath = path;
    req.contractDetails = contractDetails;
    req.requestSchema = requestSchema;
    res.responseSchemas = responseSchemas;

    req.context.span?.setAttribute(ATTR_API_NAME, req.contractDetails?.name);
    next?.();
  };
}
