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
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
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
 *
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface MiddlewareResponse<
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> extends ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>,
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
      | 'end'
      | 'locals'
      | 'type'
      | 'on'
    >,
    ForklaunchStatusResponse<ForklaunchSendableData> {
  /** If cors are applied to the response */
  cors: boolean;
}
