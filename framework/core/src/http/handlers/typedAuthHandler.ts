import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaAuthMapper } from '../types/apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  Method,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods,
  SessionObject,
  VersionSchema
} from '../types/contractDetails.types';

export function typedAuthHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  VersionedApi extends VersionSchema<SV, Method>,
  SessionSchema extends SessionObject<SV>,
  BaseRequest
>(
  _schemaValidator: SV,
  _contractDetails: ContractDetails<
    SV,
    Name,
    Method,
    `/${string}`,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    VersionedApi,
    SessionSchema,
    BaseRequest,
    SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      SessionSchema,
      BaseRequest
    >
  >,
  authHandler: ExpressLikeSchemaAuthMapper<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    SessionSchema,
    BaseRequest
  >
) {
  return authHandler;
}
