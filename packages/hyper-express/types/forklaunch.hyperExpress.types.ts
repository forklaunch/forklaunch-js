import { FlattenKeys } from '@forklaunch/common';
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
  MiddlewareNext
} from 'hyper-express';
import { ParsedQs } from 'qs';

/**
 * Extends the Forklaunch request interface with properties from Hyper-Express's request interface.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template _ResBody - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export interface Request<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> extends ForklaunchRequest<SV, P, ReqBody, ReqQuery>,
    Omit<ExpressRequest<LocalsObj>, 'params' | 'query' | 'headers'> {
  /** The request body */
  body: ReqBody;
  /** The request query parameters */
  query: ReqQuery;
  /** The request parameters */
  params: P;
}

/**
 * Extends the Forklaunch response interface with properties from Hyper-Express's response interface.
 *
 * @template ResBody - A type for the response body, defaulting to unknown.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface Response<
  ResBody = unknown,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
> extends ForklaunchResponse<ResBody, StatusCode>,
    Omit<
      ExpressResponse<LocalsObj>,
      | 'getHeaders'
      | 'setHeader'
      | 'send'
      | 'status'
      | 'statusCode'
      | 'json'
      | 'jsonp'
    > {
  /** The body data of the response */
  bodyData: unknown;
  /** The status code of the response */
  _status_code: StatusCode;
  /** Whether the response is corked */
  _cork: boolean;
  /** Whether the response is currently corked */
  _corked: boolean;
}

/**
 * Represents a middleware handler with schema validation.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ResBody - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface MiddlewareHandler<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
> {
  (
    req: Request<SV, P, ReqBody, ReqQuery, LocalsObj>,
    res: Response<ResBody, LocalsObj, StatusCode>,
    next?: MiddlewareNext
  ): void | Promise<void>;
}

/**
 * Represents a schema middleware handler with typed parameters, responses, body, and query.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResBody - A type for response schemas, defaulting to ResponsesObject.
 * @template ReqBody - A type for the request body, defaulting to Body.
 * @template ReqQuery - A type for the request query, defaulting to QueryObject.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export type SchemaMiddlewareHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV> = ParamsObject<SV>,
  ResBody extends ResponsesObject<SV> = ResponsesObject<SV>,
  ReqBody extends Body<SV> = Body<SV>,
  ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> = MiddlewareHandler<
  SV,
  MapSchema<SV, P>,
  MapSchema<SV, ResBody> & { 500: string },
  MapSchema<SV, ReqBody>,
  MapSchema<SV, ReqQuery>,
  LocalsObj,
  FlattenKeys<ResBody> & number
>;
