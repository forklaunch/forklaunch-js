import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  patch as innerPatch,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { NextFunction, Request, Response } from 'express';

/**
 * Creates a PATCH route handler with schema validation and type safety.
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
 * @param {ContractDetails<SV, 'patch', Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request, Response, NextFunction>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Express
 *
 * @example
 * ```typescript
 * patch(
 *   schemaValidator,
 *   '/users/:id',
 *   {
 *     summary: 'Update user partially',
 *     description: 'Updates specific fields of a user by ID',
 *     tags: ['users'],
 *     parameters: [
 *       {
 *         name: 'id',
 *         in: 'path',
 *         required: true,
 *         schema: { type: 'string' }
 *       }
 *     ],
 *     requestBody: {
 *       content: {
 *         'application/json': {
 *           schema: {
 *             type: 'object',
 *             properties: {
 *               name: { type: 'string' },
 *               email: { type: 'string' }
 *             }
 *           }
 *         }
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
 *                 name: { type: 'string' },
 *                 email: { type: 'string' }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { id } = req.params;
 *     const updates = req.body;
 *     const user = await updateUser(id, updates);
 *     res.json(user);
 *   }
 * );
 * ```
 */
export const patch = <
  SV extends AnySchemaValidator,
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
    'patch',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    Request
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
    Request,
    Response,
    NextFunction
  >[]
) => {
  return innerPatch<
    SV,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    Request,
    Response,
    NextFunction
  >(schemaValidator, path, contractDetails, ...handlers);
};
