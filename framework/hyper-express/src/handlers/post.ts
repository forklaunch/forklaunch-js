import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  post as innerPost,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods
} from '@forklaunch/core/http';
import {
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';

/**
 * Creates a POST route handler with schema validation and type safety.
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
 * @param {ContractDetails<SV, 'post', Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request<LocalsObj>>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request<LocalsObj>, Response<LocalsObj>, MiddlewareNext>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Hyper-Express
 *
 * @example
 * ```typescript
 * post(
 *   schemaValidator,
 *   '/users',
 *   {
 *     summary: 'Create user',
 *     description: 'Creates a new user',
 *     tags: ['users'],
 *     requestBody: {
 *       content: {
 *         'application/json': {
 *           schema: {
 *             type: 'object',
 *             properties: {
 *               name: { type: 'string' },
 *               email: { type: 'string' },
 *               password: { type: 'string' }
 *             },
 *             required: ['name', 'email', 'password']
 *           }
 *         }
 *       }
 *     },
 *     responses: {
 *       201: {
 *         description: 'User created successfully',
 *         content: {
 *           'application/json': {
 *             schema: {
 *               type: 'object',
 *               properties: {
 *                 id: { type: 'string' },
 *                 name: { type: 'string' },
 *                 email: { type: 'string' }
 *               }
 *             }
 *           }
 *         }
 *       },
 *       400: {
 *         description: 'Invalid input',
 *         content: {
 *           'application/json': {
 *             schema: {
 *               type: 'object',
 *               properties: {
 *                 error: { type: 'string' }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const userData = await req.json();
 *     const user = await createUser(userData);
 *     res.status(201).json(user);
 *   }
 * );
 * ```
 */
export const post = <
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
  const Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    Request<LocalsObj>
  >
>(
  schemaValidator: SV,
  path: Path,
  contractDetails: ContractDetails<
    SV,
    Name,
    'post',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
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
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext
  >[]
) => {
  return innerPost<
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
    MiddlewareNext,
    Auth
  >(schemaValidator, path, contractDetails, ...handlers);
};
