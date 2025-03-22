import { extractArgumentNames } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeSchemaHandler } from '../types/apiDefinition.types';
import {
  Body,
  HeadersObject,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '../types/contractDetails.types';

export function isExpressLikeSchemaHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  BaseRequest,
  BaseResponse,
  NextFunction
>(
  middleware: unknown
): middleware is ExpressLikeSchemaHandler<
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
> {
  const extractedArgumentNames =
    typeof middleware === 'function' &&
    new Set(
      extractArgumentNames(middleware).map((argumentName) =>
        argumentName.toLowerCase()
      )
    );
  return extractedArgumentNames && extractedArgumentNames.size <= 3;
}
