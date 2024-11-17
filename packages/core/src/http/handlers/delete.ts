import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaHandler } from '../types/apiDefinition.types';
import {
  Body,
  HeadersObject,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';
import { typedHandler } from './typedHandler';

export const delete_ = <
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
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
    ResHeaders
  >,
  ...handlers: ExpressLikeSchemaHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  >[]
) => {
  return typedHandler<
    SV,
    'delete',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  >(_schemaValidator, path, 'delete', contractDetails, ...handlers);
};