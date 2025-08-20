import { AnySchemaValidator } from '@forklaunch/validator';

import {
  Body,
  HeadersObject,
  Method,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods,
  SessionObject,
  VersionSchema
} from '../types/contractDetails.types';
import { TypedHandler } from '../types/typedHandler.types';

export function isTypedHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  ContractMethod extends Method,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  VersionedApi extends VersionSchema<SV, ContractMethod>,
  Session extends SessionObject<SV>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  const Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    Session,
    BaseRequest
  >
>(
  maybeTypedHandler: unknown
): maybeTypedHandler is TypedHandler<
  SV,
  Name,
  ContractMethod,
  Path,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj,
  VersionedApi,
  Session,
  BaseRequest,
  BaseResponse,
  NextFunction,
  Auth
> {
  return (
    maybeTypedHandler != null &&
    typeof maybeTypedHandler === 'object' &&
    '_typedHandler' in maybeTypedHandler &&
    maybeTypedHandler._typedHandler === true
  );
}
