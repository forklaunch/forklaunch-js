import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaHandler } from '../types/apiDefinition.types';
import {
  Body,
  HeadersObject,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods,
  VersionSchema
} from '../types/contractDetails.types';
import { typedHandler } from './typedHandler';

export const delete_ = <
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  VersionedApi extends VersionSchema<SV, 'delete'>,
  SessionSchema extends Record<string, unknown>,
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
    SessionSchema,
    BaseRequest
  >
>(
  _schemaValidator: SV,
  path: Path,
  contractDetails: PathParamHttpContractDetails<
    SV,
    Name,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    VersionedApi,
    SessionSchema,
    BaseRequest,
    Auth
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
    VersionedApi,
    SessionSchema,
    BaseRequest,
    BaseResponse,
    NextFunction
  >[]
) => {
  return typedHandler<
    SV,
    Name,
    'delete',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    VersionedApi,
    SessionSchema,
    BaseRequest,
    BaseResponse,
    NextFunction,
    Auth
  >(_schemaValidator, path, 'delete', contractDetails, ...handlers);
};
