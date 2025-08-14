import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  get as innerGet,
  ParamsObject,
  QueryObject,
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
 * Creates a GET route handler with schema validation and type safety.
 *
 * @template SV - Schema validator type extending AnySchemaValidator
 * @template Name - The name of the route
 * @template Path - Route path type extending string with leading slash
 * @template P - Parameters object type extending ParamsObject
 * @template ResBodyMap - Response body map type extending ResponsesObject
 * @template ReqBody - Request body type extending Body
 * @template ReqQuery - Request query type extending QueryObject
 * @template ReqHeaders - Request headers type extending HeadersObject
 * @template ResHeaders - Response headers type extending HeadersObject
 * @template LocalsObj - Local variables type extending Record<string, unknown>
 * @template Auth - Auth methods type extending AuthMethodsBase
 *
 * @param {SV} schemaValidator - Schema validator instance
 * @param {Path} path - Route path starting with '/'
 * @param {ContractDetails<SV, 'get', Name, Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request, Auth>} contractDetails - Contract details for route validation
 * @param {...ExpressLikeSchemaHandler[]} handlers - Route handler middleware functions
 * @returns {Function} Express route handler with schema validation
 *
 * @example
 * ```typescript
 * const getUser = get(
 *   schemaValidator,
 *   '/users/:id',
 *   {
 *     params: { id: 'string' },
 *     responses: {
 *       200: { type: 'object', properties: { name: { type: 'string' } } }
 *     }
 *   },
 *   async (req, res) => {
 *     const user = await getUserById(req.params.id);
 *     res.json(user);
 *   }
 * );
 * ```
 */
export const get = <
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
  const VersionedApi extends VersionSchema<SV, 'get'>,
  const SessionSchema extends SessionObject<SV>,
  const Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    SessionSchema,
    Request
  >
>(
  schemaValidator: SV,
  path: Path,
  contractDetails: ContractDetails<
    SV,
    Name,
    'get',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    VersionedApi,
    SessionSchema,
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
    SessionSchema,
    Request,
    Response,
    NextFunction
  >[]
) => {
  return innerGet<
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
    SessionSchema,
    Request,
    Response,
    NextFunction,
    Auth
  >(schemaValidator, path, contractDetails, ...handlers);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Dummy = SetExportTypes<ParsedQs, express.Express, Range>;
