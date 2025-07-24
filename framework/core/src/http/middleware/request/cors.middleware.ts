import corsMiddleware, { CorsOptions } from 'cors';
import { ParsedQs } from 'qs';
import {
  ForklaunchBaseRequest,
  ForklaunchNextFunction,
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
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, unknown>,
  LocalsObj extends Record<string, unknown>
>(corsOptions: CorsOptions) {
  return (
    req: ForklaunchBaseRequest<P, ReqBody, ReqQuery, ReqHeaders>,
    res: ForklaunchResponse<
      unknown,
      ResBodyMap,
      ForklaunchResHeaders & ResHeaders,
      LocalsObj,
      never
    >,
    next?: ForklaunchNextFunction
  ) => {
    if (req.method === 'OPTIONS') {
      res.cors = true;
    }
    if (!res.getHeader) {
      res.getHeader = (key: string) => {
        return res.getHeaders()[key] as string | string[] | undefined;
      };
    }
    corsMiddleware(corsOptions)(
      req as typeof req & { headers: Record<string, string> },
      res,
      next ?? (() => {})
    );
  };
}
