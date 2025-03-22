import { AnySchemaValidator } from '@forklaunch/validator';
import corsMiddleware from 'cors';
import { ParsedQs } from 'qs';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResHeaders,
  ForklaunchResponse
} from '../../types/apiDefinition.types';
import { ParamsDictionary } from '../../types/contractDetails.types';

/**
 * Cors middleware handler
 *
 * @param req - Express-like request object
 * @param res - Express-like response object
 * @param next - Express-like next function
 */
export function cors<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
>(
  req: ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
  res: ForklaunchResponse<
    ResBodyMap,
    ForklaunchResHeaders & ResHeaders,
    LocalsObj
  >,
  next?: ForklaunchNextFunction
) {
  if (req.method === 'OPTIONS') {
    res.cors = true;
  }
  corsMiddleware()(req, res, next ?? (() => {}));
}
