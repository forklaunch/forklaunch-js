import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  middleware,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { NextFunction, Request, Response } from 'express';
import express from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { SetQsAndStaticTypes } from '../types/export.types';

/**
 * Creates a PURGE route handler with schema validation and type safety.
 *
 * @template SV - The schema validator type
 * @template Path - The route path type (must start with '/')
 * @template P - The path parameters type
 * @template ResBodyMap - The response body map type
 * @template ReqQuery - The request query parameters type
 * @template ReqHeaders - The request headers type
 * @template ResHeaders - The response headers type
 * @template LocalsObj - The locals object type
 *
 * @param {SV} schemaValidator - The schema validator instance
 * @param {Path} path - The route path
 * @param {ContractDetails<SV, 'purge', Path, P, ResBodyMap, never, ReqQuery, ReqHeaders, ResHeaders, Request>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, never, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request, Response, NextFunction>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Express
 *
 * @example
 * ```typescript
 * purge(
 *   schemaValidator,
 *   '/cache/:id',
 *   {
 *     summary: 'Purge cache',
 *     description: 'Removes an item from the cache',
 *     tags: ['cache'],
 *     parameters: [
 *       {
 *         name: 'id',
 *         in: 'path',
 *         required: true,
 *         schema: { type: 'string' }
 *       }
 *     ],
 *     responses: {
 *       204: {
 *         description: 'Cache item purged successfully'
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { id } = req.params;
 *     await purgeCacheItem(id);
 *     res.status(204).send();
 *   }
 * );
 * ```
 */
export const purge = <
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
    'middleware',
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
  return middleware<
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Dummy = SetQsAndStaticTypes<ParsedQs, express.Express>;
