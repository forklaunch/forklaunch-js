import { AnySchemaValidator } from '@forklaunch/validator';
import { TypedHandler } from '../handlers/typedHandler';
import {
  Body,
  HeadersObject,
  Method,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';

export function isTypedHandler<
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
  maybeTypedHandler: unknown
): maybeTypedHandler is TypedHandler<
  SV,
  ContractMethod,
  Path,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj
> {
  return (
    maybeTypedHandler != null &&
    typeof maybeTypedHandler === 'object' &&
    '_typedHandler' in maybeTypedHandler &&
    maybeTypedHandler._typedHandler === true
  );
}
