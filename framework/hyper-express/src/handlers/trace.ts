import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  trace as innerTrace,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core/http';
import {
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';

/**
 * Creates a TRACE route handler with schema validation and type safety.
 *
 * @template SV - The schema validator type
 * @template Path - The route path type (must start with '/')
 * @template P - The path parameters type
 * @template ResBodyMap - The response body map type
 * @template ReqBody - The request body type
 * @template ReqQuery - The request query parameters type
 * @template ReqHeaders - The request headers type
 * @template ResHeaders - The response headers type
 * @template LocalsObj - The locals object type
 *
 * @param {SV} schemaValidator - The schema validator instance
 * @param {Path} path - The route path
 * @param {ContractDetails<SV, 'trace', Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request<LocalsObj>>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request<LocalsObj>, Response<LocalsObj>, MiddlewareNext>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Hyper-Express
 *
 * @example
 * ```typescript
 * trace(
 *   schemaValidator,
 *   '/debug',
 *   {
 *     summary: 'Debug endpoint',
 *     description: 'Returns the request message for debugging purposes',
 *     tags: ['debug'],
 *     responses: {
 *       200: {
 *         description: 'Request message returned successfully',
 *         content: {
 *           'message/http': {
 *             schema: {
 *               type: 'string'
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const message = await req.text();
 *     res.setHeader('content-type', 'message/http');
 *     res.status(200).send(message);
 *   }
 * );
 * ```
 */
export const trace = <
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  schemaValidator: SV,
  path: Path,
  contractDetails: ContractDetails<
    SV,
    Name,
    'trace',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    Request<LocalsObj>
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
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext
  >[]
) => {
  return innerTrace<
    SV,
    Name,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext
  >(schemaValidator, path, contractDetails, ...handlers);
};
