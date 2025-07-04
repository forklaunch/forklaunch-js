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

/**
 * Type guard that checks if an object is an Express-like schema handler.
 * A schema handler is a function that takes up to 3 arguments (request, response, next)
 * and is used for middleware or route handlers in an Express-like application.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @template P - The type of route parameters
 * @template ResBodyMap - The type of response body mapping
 * @template ReqBody - The type of request body
 * @template ReqQuery - The type of request query parameters
 * @template ReqHeaders - The type of request headers
 * @template ResHeaders - The type of response headers
 * @template LocalsObj - The type of locals object
 * @template BaseRequest - The base request type
 * @template BaseResponse - The base response type
 * @template NextFunction - The type of next function
 * @param {unknown} middleware - The object to check
 * @returns {boolean} A type predicate indicating whether the object is an ExpressLikeSchemaHandler
 *
 * @example
 * ```ts
 * if (isExpressLikeSchemaHandler(middleware)) {
 *   // middleware is now typed as ExpressLikeSchemaHandler
 *   middleware(req, res, next);
 * }
 * ```
 */
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
  return extractedArgumentNames && extractedArgumentNames.size <= 4;
}
