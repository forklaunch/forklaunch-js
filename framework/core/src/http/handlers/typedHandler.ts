import { AnySchemaValidator } from '@forklaunch/validator';
import { isPath } from '../guards/isPath';
import { ExpressLikeSchemaHandler } from '../types/apiDefinition.types';
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
import { ExpressLikeTypedHandler } from '../types/typedHandler.types';

/**
 * Router class that sets up routes and middleware for an Express router, for use with controller/routes pattern.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template contractDetails - The contract details.
 * @template handlers - The handler middlware and handler.
 */
export function typedHandler<
  SV extends AnySchemaValidator,
  ContractMethod extends Method,
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
  _path: Path | undefined,
  _contractMethod: ContractMethod,
  contractDetails: ContractDetails<
    SV,
    ContractMethod,
    Path,
    P,
    ResBodyMap,
    ReqBody,
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
): ExpressLikeTypedHandler<
  SV,
  ContractMethod,
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
>;
export function typedHandler<
  SV extends AnySchemaValidator,
  ContractMethod extends Method,
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
  _contractMethod: ContractMethod,
  contractDetails: ContractDetails<
    SV,
    ContractMethod,
    Path,
    P,
    ResBodyMap,
    ReqBody,
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
): ExpressLikeTypedHandler<
  SV,
  ContractMethod,
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
>;
export function typedHandler<
  SV extends AnySchemaValidator,
  ContractMethod extends Method,
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
  pathOrContractMethod: Path | ContractMethod,
  contractMethodOrContractDetails:
    | ContractMethod
    | ContractDetails<
        SV,
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        BaseRequest
      >,
  contractDetailsOrHandler:
    | ContractDetails<
        SV,
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        BaseRequest
      >
    | ExpressLikeSchemaHandler<
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
      >,
  ...handlerArray: ExpressLikeSchemaHandler<
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
): ExpressLikeTypedHandler<
  SV,
  ContractMethod,
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
> {
  // TODO: Clean this up with guards

  let contractDetails: ContractDetails<
    SV,
    ContractMethod,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    BaseRequest
  >;
  let handlers: ExpressLikeSchemaHandler<
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
  >[];
  // If path is not provided
  if (typeof contractMethodOrContractDetails === 'string') {
    if (typeof contractDetailsOrHandler !== 'function') {
      contractDetails = contractDetailsOrHandler;
    } else {
      throw new Error('Invalid definition for contract details');
    }
    handlers = handlerArray;
  }
  // If path is provided
  else {
    contractDetails = contractMethodOrContractDetails;
    if (typeof contractDetailsOrHandler === 'function') {
      handlers = [contractDetailsOrHandler, ...handlerArray];
    } else {
      throw new Error('Invalid definition for handler');
    }
  }
  return {
    _typedHandler: true as const,
    _path: isPath(pathOrContractMethod) ? pathOrContractMethod : undefined,
    contractDetails,
    handlers
  };
}
