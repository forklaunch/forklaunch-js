import {
  ForklaunchRequest,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse,
  ParamsDictionary
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';
import { ParsedQs } from 'qs';

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
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> extends ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
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
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> extends ForklaunchResponse<
      ExpressResponse,
      ResBodyMap,
      ResHeaders,
      LocalsObj
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
