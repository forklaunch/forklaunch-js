import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import { v4 } from 'uuid';
import { ExpressLikeSchemaHandler } from '../../types/apiDefinition.types';
import {
  Body,
  HeadersObject,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '../../types/contractDetails.types';

/**
 * Middleware to create and add a request context.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Function} - Middleware function to create request context.
 */
export function createContext<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  schemaValidator: SV
): ExpressLikeSchemaHandler<
  SV,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj
> {
  return (req, res, next?) => {
    console.debug('[MIDDLEWARE] createRequestContext started');
    req.schemaValidator = schemaValidator as SchemaValidator;

    let correlationId = v4();

    if (req.headers['x-correlation-id']) {
      correlationId = req.headers['x-correlation-id'];
    }

    res.setHeader('x-correlation-id', correlationId);

    req.context = {
      correlationId: correlationId
    };

    next?.();
  };
}
