import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  middleware,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  SchemaAuthMethods
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
 * @template Name - The name of the route
 * @template Path - The route path type
 * @template P - The path parameters type
 * @template ResBodyMap - The response body map type
 * @template ReqBody - The request body type
 * @template ReqQuery - The request query parameters type
 * @template ReqHeaders - The request headers type
 * @template ResHeaders - The response headers type
 * @template LocalsObj - The locals object type
 * @template Auth - The authentication methods base type
 *
 * @param {SV} schemaValidator - The schema validator instance
 * @param {Path} path - The route path
 * @param {ContractDetails<SV, 'propfind', Name, Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request, Auth>} contractDetails - The contract details for the route
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
    Request
  >
>(
  schemaValidator: SV,
  path: Path,
  contractDetails: ContractDetails<
    SV,
    Name,
    'middleware',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    Request,
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
    Request,
    Response,
    NextFunction
  >[]
) => {
  return middleware<
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
    Request,
    Response,
    NextFunction,
    Auth
  >(schemaValidator, path, contractDetails, ...handlers);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Dummy = SetQsAndStaticTypes<ParsedQs, express.Express>;
