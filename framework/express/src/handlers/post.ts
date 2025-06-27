import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  post as innerPost,
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
 * Creates a POST route handler with schema validation and type safety.
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
 *
 * @param {SV} schemaValidator - Schema validator instance
 * @param {Path} path - Route path starting with '/'
 * @param {ContractDetails<SV, 'post', Name, Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request>} contractDetails - Contract details for route validation
 * @param {...ExpressLikeSchemaHandler[]} handlers - Route handler middleware functions
 * @returns {Function} Express route handler with schema validation
 *
 * @example
 * ```typescript
 * const createUser = post(
 *   schemaValidator,
 *   '/users',
 *   {
 *     body: {
 *       type: 'object',
 *       properties: { name: { type: 'string' } },
 *       required: ['name']
 *     },
 *     responses: {
 *       201: { type: 'object', properties: { id: { type: 'string' } } }
 *     }
 *   },
 *   async (req, res) => {
 *     const user = await createNewUser(req.body);
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
  LocalsObj extends Record<string, unknown>
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
    Request,
    Response,
    NextFunction
  >(schemaValidator, path, contractDetails, ...handlers);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Dummy = SetQsAndStaticTypes<ParsedQs, express.Express>;
