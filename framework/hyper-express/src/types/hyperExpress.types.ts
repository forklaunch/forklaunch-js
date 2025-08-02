import {
  ForklaunchRequest,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse,
  ParamsDictionary,
  ParsedQs
} from '@forklaunch/core/http';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  MiddlewareNext
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';

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
export interface InternalRequest<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends Record<string, unknown>,
  ReqHeaders extends Record<string, unknown>,
  LocalsObj extends Record<string, unknown>,
  Version extends string
> extends ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders, Version>,
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
export interface InternalResponse<
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>,
  Version extends string
> extends ForklaunchResponse<
      ExpressResponse,
      ResBodyMap,
      ResHeaders,
      LocalsObj,
      Version
    >,
    Omit<
      ExpressResponse<LocalsObj>,
      | 'getHeader'
      | 'getHeaders'
      | 'setHeader'
      | 'headersSent'
      | 'send'
      | 'status'
      | 'statusCode'
      | 'json'
      | 'jsonp'
      | 'end'
      | 'type'
      | 'on'
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

/**
 * A request handler function compatible with Hyper-Express, used for processing HTTP requests.
 *
 * @param req - The incoming request object, with `query` and `headers` properties normalized to either `ParsedQs` or a generic record.
 * @param res - The response object for sending data back to the client.
 * @param next - The middleware next function to pass control to the next handler.
 */
export type ExpressRequestHandler = (
  req: Omit<ExpressRequest<Record<string, unknown>>, 'query' | 'headers'> & {
    query: ParsedQs | Record<string, unknown>;
    headers: Record<string, unknown>;
  },
  res: ExpressResponse<Record<string, unknown>>,
  next: MiddlewareNext
) => void;
