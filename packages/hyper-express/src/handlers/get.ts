import {
  Body,
  ExpressLikeSchemaHandler,
  HeadersObject,
  get as innerGet,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { HyperExpressSchemaHandler } from '../types/hyperExpress.types';

export const get = <
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
  schemaValidator: SV,
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
  ...handlers: HyperExpressSchemaHandler<
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
  return innerGet<
    SV,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj
  >(
    schemaValidator,
    path,
    contractDetails,
    ...(handlers as unknown as ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj
    >[])
  );
};
