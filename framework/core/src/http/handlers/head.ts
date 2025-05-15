import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaHandler } from '../types/apiDefinition.types';
import {
  Body,
  HeadersObject,
  MultipartForm,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject,
  UrlEncodedForm
} from '../types/contractDetails.types';
import { typedHandler } from './typedHandler';

export const head = <
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV> | MultipartForm<SV> | UrlEncodedForm<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  BaseRequest,
  BaseResponse,
  NextFunction
>(
  _schemaValidator: SV,
  path: Path,
  contractDetails: PathParamHttpContractDetails<
    SV,
    Path,
    P,
    ResBodyMap,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    BaseRequest
  >,
  ...handlers: ExpressLikeSchemaHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    BaseRequest,
    BaseResponse,
    NextFunction
  >[]
) => {
  return typedHandler<
    SV,
    'head',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    BaseRequest,
    BaseResponse,
    NextFunction
  >(_schemaValidator, path, 'head', contractDetails, ...handlers);
};
