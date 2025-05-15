import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaAuthMapper } from '../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  Method,
  MultipartForm,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  UrlEncodedForm
} from '../types/contractDetails.types';

export function typedAuthHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV> | MultipartForm<SV> | UrlEncodedForm<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  BaseRequest
>(
  _schemaValidator: SV,
  _contractDetails: ContractDetails<
    SV,
    Method,
    `/${string}`,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    BaseRequest
  >,
  authHandler: ExpressLikeSchemaAuthMapper<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    BaseRequest
  >
) {
  return authHandler;
}
