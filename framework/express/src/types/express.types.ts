import {
  ForklaunchRequest,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse,
  ParamsDictionary,
  ParsedQs
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';
import { NextFunction } from 'express-serve-static-core';
import { IncomingHttpHeaders } from 'http';

/**
 * Extends the Forklaunch request interface with properties from Express's request interface.
 * This interface combines the functionality of both Forklaunch and Express request objects
 * while avoiding property conflicts through strategic omission.
 *
 * @template SV - Schema validator type extending AnySchemaValidator
 * @template P - Request parameters type extending ParamsDictionary
 * @template ResBodyMap - Response body map type as a record with numeric keys
 * @template ReqBody - Request body type as a record with string keys
 * @template ReqQuery - Request query type extending ParsedQs
 * @template ReqHeaders - Request headers type as a record with string keys
 * @template LocalsObj - Local variables type as a record with string keys
 *
 * @example
 * ```typescript
 * interface UserRequest extends MiddlewareRequest<
 *   SchemaValidator,
 *   { id: string },
 *   { 200: { name: string } },
 *   { name: string },
 *   { filter: string },
 *   { 'content-type': string },
 *   { user: User }
 * > {}
 * ```
 */
export interface MiddlewareRequest<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends Record<string, unknown>,
  ReqHeaders extends Record<string, unknown>,
  LocalsObj extends Record<string, unknown>,
  Versions extends string,
  SessionSchema extends Record<string, unknown>
>
  extends
    ForklaunchRequest<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      Versions,
      SessionSchema
    >,
    Omit<
      ExpressRequest<P, ResBodyMap, ReqBody, ReqQuery, LocalsObj>,
      'method' | 'body' | 'params' | 'query' | 'headers' | 'path'
    > {}

/**
 * Extends the Forklaunch response interface with properties from Express's response interface.
 * This interface combines the functionality of both Forklaunch and Express response objects
 * while avoiding property conflicts through strategic omission. It also includes status response
 * functionality and CORS support.
 *
 * @template ResBodyMap - Response body map type as a record with numeric keys
 * @template ResHeaders - Response headers type as a record with string keys
 * @template LocalsObj - Local variables type as a record with string keys
 *
 * @property {boolean} cors - Indicates whether CORS headers are applied to the response
 *
 * @example
 * ```typescript
 * interface UserResponse extends MiddlewareResponse<
 *   { 200: { name: string }, 404: { error: string } },
 *   { 'content-type': string },
 *   { user: User }
 * > {}
 *
 * // Usage in a route handler
 * app.get('/users/:id', (req, res: UserResponse) => {
 *   res.cors = true; // Enable CORS
 *   res.json({ name: 'John' });
 * });
 * ```
 */
export interface MiddlewareResponse<
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  Versions extends string = string
>
  extends
    ForklaunchResponse<
      ExpressResponse,
      ResBodyMap,
      ResHeaders,
      LocalsObj,
      Versions
    >,
    Omit<
      ExpressResponse<ResBodyMap, LocalsObj>,
      | 'status'
      | 'statusCode'
      | 'sendStatus'
      | 'getHeaders'
      | 'getHeader'
      | 'setHeader'
      | 'send'
      | 'json'
      | 'jsonp'
      | 'end'
      | 'locals'
      | 'type'
      | 'on'
    >,
    ForklaunchStatusResponse<ForklaunchSendableData> {
  /** Whether CORS headers are applied to the response */
  cors: boolean;
}

/**
 * Express-compatible request handler type for Forklaunch.
 *
 * @param req - The incoming request object, with `query` and `headers` properties normalized to either `ParsedQs` or a generic record.
 * @param res - The response object for sending data back to the client.
 * @param next - The next middleware function in the Express stack.
 *
 * @example
 * const handler: ExpressRequestHandler = (req, res, next) => {
 *   // Access normalized query and headers
 *   const userId = req.query.userId;
 *   const customHeader = req.headers['x-custom-header'];
 *   res.json({ userId, customHeader });
 * };
 */
export type ExpressRequestHandler = (
  req: Omit<ExpressRequest, 'query' | 'headers'> & {
    query: ParsedQs | Record<string, unknown>;
    headers: IncomingHttpHeaders | Record<string, unknown>;
  },
  res: ExpressResponse,
  next: NextFunction
) => void;
