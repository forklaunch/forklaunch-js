import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  middleware,
  ParamsObject,
  QueryObject,
  ResolvedSessionObject,
  ResponsesObject,
  SchemaAuthMethods,
  SessionObject,
  VersionSchema
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { NextFunction, Request, Response } from 'express';
import express from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Range } from 'range-parser';
import { SetExportTypes } from '../types/export.types';

/**
 * Creates a NOTIFY route handler with schema validation and type safety.
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
 * @template Auth - The authentication method type
 *
 * @param {SV} schemaValidator - The schema validator instance
 * @param {Path} path - The route path
 * @param {ContractDetails<SV, 'middleware', Name, Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request, Auth>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request, Auth>} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Express
 *
 * @example
 * ```typescript
 * notify(
 *   schemaValidator,
 *   '/notifications',
 *   {
 *     summary: 'Send notification',
 *     description: 'Sends a notification to subscribers',
 *     tags: ['notifications'],
 *     body: {
 *       type: 'object',
 *       properties: {
 *         message: { type: 'string' },
 *         type: { type: 'string' }
 *       }
 *     },
 *     responses: {
 *       200: {
 *         description: 'Notification sent successfully',
 *         content: {
 *           'application/json': {
 *             schema: {
 *               type: 'object',
 *               properties: {
 *                 id: { type: 'string' },
 *                 status: { type: 'string' }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { message, type } = req.body;
 *     // Notification logic
 *     res.json({ id: 'not_123', status: 'sent' });
 *   }
 * );
 * ```
 */
export const notify = <
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
  const VersionedApi extends VersionSchema<SV, 'middleware'>,
  const Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
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
    VersionedApi,
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
    VersionedApi,
    ResolvedSessionObject<SV, Auth, SessionObject<SV>>,
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
    VersionedApi,
    Request,
    Response,
    NextFunction,
    Auth
  >(schemaValidator, path, contractDetails, ...handlers);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Dummy = SetExportTypes<ParsedQs, express.Express, Range>;
