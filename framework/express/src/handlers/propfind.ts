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
 * Creates a PROPFIND route handler with schema validation and type safety.
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
 * @param {ContractDetails<SV, 'propfind', Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request, Response, NextFunction>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Express
 *
 * @example
 * ```typescript
 * propfind(
 *   schemaValidator,
 *   '/resources/:id',
 *   {
 *     summary: 'Get resource properties',
 *     description: 'Retrieves properties of a resource',
 *     tags: ['resources'],
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
 *         'application/xml': {
 *           schema: {
 *             type: 'string',
 *             description: 'XML request body with property names to retrieve'
 *           }
 *         }
 *       }
 *     },
 *     responses: {
 *       207: {
 *         description: 'Multi-status response with property values',
 *         content: {
 *           'application/xml': {
 *             schema: {
 *               type: 'string',
 *               description: 'XML response with property values'
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { id } = req.params;
 *     const xmlRequest = req.body;
 *     const properties = await getResourceProperties(id, xmlRequest);
 *     res.status(207).type('application/xml').send(properties);
 *   }
 * );
 * ```
 */
export const propfind = <
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
