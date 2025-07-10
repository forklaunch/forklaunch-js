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
 * Creates an MKCACTIVITY route handler with schema validation and type safety.
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
 * @param {ContractDetails<SV, 'middleware', Name, Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request, Auth>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request, Response, NextFunction>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Express
 *
 * @example
 * ```typescript
 * mkcActivity(
 *   schemaValidator,
 *   '/activities',
 *   {
 *     summary: 'Create activity',
 *     description: 'Creates a new activity',
 *     tags: ['activities'],
 *     body: {
 *       type: 'object',
 *       properties: {
 *         name: { type: 'string' },
 *         type: { type: 'string' }
 *       }
 *     },
 *     responses: {
 *       201: {
 *         description: 'Activity created successfully',
 *         content: {
 *           'application/json': {
 *             schema: {
 *               type: 'object',
 *               properties: {
 *                 id: { type: 'string' },
 *                 name: { type: 'string' },
 *                 type: { type: 'string' }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { name, type } = req.body;
 *     // Create activity logic
 *     res.status(201).json({ id: 'act_123', name, type });
 *   }
 * );
 * ```
 */
export const mkcActivity = <
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
