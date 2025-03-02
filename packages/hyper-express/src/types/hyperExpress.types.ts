import {
  ForklaunchRequest,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse,
  ParamsDictionary
} from '@forklaunch/core/http';
import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
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
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> extends ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
    Omit<
      ExpressRequest<LocalsObj>,
      'method' | 'params' | 'query' | 'headers' | 'path'
    > {
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
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> extends ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>,
    Omit<
      ExpressResponse<LocalsObj>,
      | 'getHeaders'
      | 'setHeader'
      | 'headersSent'
      | 'send'
      | 'status'
      | 'statusCode'
      | 'json'
      | 'jsonp'
      | 'end'
    >,
    ForklaunchStatusResponse<ForklaunchSendableData> {
  /** The body data of the response */
  bodyData: unknown;
  /** If cors are applied to the response */
  cors: boolean;
  /** The status code of the response */
  _status_code: number;
  /** Whether the response is corked */
  _cork: boolean;
  /** Whether the response is currently corked */
  _corked: boolean;
}
