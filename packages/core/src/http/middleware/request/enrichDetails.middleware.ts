import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaMiddlewareHandler } from '../../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  Method,
  ParamsObject,
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
  ContractMethod extends Method,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  contractDetails: ContractDetails<
    SV,
    ContractMethod,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders
  >,
  requestSchema: unknown,
  responseSchemas: ResponseCompiledSchema
): ExpressLikeSchemaMiddlewareHandler<
  SV,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj
> {
  return (req, res, next?) => {
    console.debug('[MIDDLEWARE] enrichRequestDetails started');
    req.contractDetails = contractDetails;
    req.requestSchema = requestSchema;
    res.responseSchemas = responseSchemas;
    next?.();
  };
}
