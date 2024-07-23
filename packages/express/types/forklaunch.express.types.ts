import { FlattenKeys, Prettify } from '@forklaunch/common';
import {
  Body,
  ForklaunchRequest,
  ForklaunchResponse,
  MapSchema,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core';
import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction
} from 'express';
import { ParsedQs } from 'qs';

/**
 * Extends the Forklaunch request interface with properties from Express's request interface.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export interface Request<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ResBodyMap = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> extends ForklaunchRequest<SV, P, ReqBody, ReqQuery>,
    Omit<
      ExpressRequest<P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>,
      'body' | 'params' | 'query'
    > {}

/**
 * Extends the Forklaunch response interface with properties from Express's response interface.
 *
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface Response<
  ResBodyMap = unknown,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
> extends ForklaunchResponse<ResBodyMap, StatusCode>,
    Omit<
      ExpressResponse<ResBodyMap, LocalsObj>,
      | 'status'
      | 'statusCode'
      | 'sendStatus'
      | 'getHeaders'
      | 'setHeader'
      | 'send'
      | 'json'
      | 'jsonp'
    > {}

/**
 * Represents a request handler with schema validation.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface RequestHandler<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ResBodyMap = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
> {
  (
    req: Request<SV, P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>,
    res: Response<ResBodyMap, LocalsObj, StatusCode>,
    next?: NextFunction
  ): void | Promise<void>;
}

/**
 * Represents a schema request handler with typed parameters, responses, body, and query.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResBodyMap - A type for response schemas, defaulting to ResponsesObject.
 * @template ReqBody - A type for the request body, defaulting to Body.
 * @template ReqQuery - A type for the request query, defaulting to QueryObject.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export type SchemaRequestHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV> = ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  ReqBody extends Body<SV> = Body<SV>,
  ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> = RequestHandler<
  SV,
  MapSchema<SV, P>,
  Prettify<MapSchema<SV, ResBodyMap> & ResErrorTypes>,
  MapSchema<SV, ReqBody>,
  MapSchema<SV, ReqQuery>,
  LocalsObj,
  FlattenKeys<ResBodyMap> & number
>;

/**
 * Represents the error types for responses.
 */
export type ResErrorTypes = {
  400: string;
  500: string;
};
