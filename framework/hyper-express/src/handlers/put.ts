import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  put as innerPut,
  ParamsObject,
  QueryObject,
  ResolvedSessionObject,
  ResponsesObject,
  SchemaAuthMethods,
  SessionObject,
  VersionSchema
} from '@forklaunch/core/http';
import {
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';

/**
 * Creates a PUT route handler with schema validation and type safety for Hyper-Express.
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
 * @param {ContractDetails<SV, 'put', Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request<LocalsObj>>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request<LocalsObj>, Response<LocalsObj>, MiddlewareNext>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Hyper-Express
 *
 * @example
 * ```typescript
 * put(
 *   schemaValidator,
 *   '/users/:id',
 *   {
 *     summary: 'Update user',
 *     description: 'Updates a user by ID',
 *     tags: ['users'],
 *     pathParams: {
 *       id: { type: 'string' }
 *     },
 *     body: {
 *       type: 'object',
 *       properties: {
 *         name: { type: 'string' }
 *       }
 *     },
 *     responses: {
 *       200: {
 *         description: 'User updated successfully',
 *         content: {
 *           'application/json': {
 *             schema: {
 *               type: 'object',
 *               properties: {
 *                 id: { type: 'string' },
 *                 name: { type: 'string' }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { id } = req.params;
 *     const { name } = req.body;
 *     // Update user logic
 *     res.json({ id, name });
 *   }
 * );
 * ```
 */
export const put = <
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
  const VersionedApi extends VersionSchema<SV, 'put'>,
  const Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    Request<LocalsObj>
  >
>(
  schemaValidator: SV,
  path: Path,
  contractDetails: ContractDetails<
    SV,
    Name,
    'put',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    VersionedApi,
    Request<LocalsObj>,
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
    ResolvedSessionObject<SV, Auth, SessionObject<SV>>,
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext
  >[]
) => {
  return innerPut<
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
    VersionedApi,
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext,
    Auth
  >(schemaValidator, path, contractDetails, ...handlers);
};
