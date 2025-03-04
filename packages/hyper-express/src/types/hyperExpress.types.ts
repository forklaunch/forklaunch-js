import {
  Body,
  ForklaunchRequest,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse,
  HeadersObject,
  MapParamsSchema,
  MapReqBodySchema,
  MapReqHeadersSchema,
  MapReqQuerySchema,
  MapResBodyMapSchema,
  MapResHeadersSchema,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core/http';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  MiddlewareNext
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
export interface InternalRequest<
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
 * Extends the Forklaunch request interface with properties from Hyper-Express's request interface.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template _ResBody - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export type Request<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> = {
  [key in keyof ExpressRequest<LocalsObj>]: key extends keyof ForklaunchRequest<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders
  >
    ? ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>[key]
    : ExpressRequest<LocalsObj>[key];
};

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

/**
 * Extends the Forklaunch response interface with properties from Hyper-Express's response interface.
 *
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template ResHeaders - A type for the response headers, defaulting to Record<string, string>.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export type Response<
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> = {
  [key in keyof ExpressResponse<LocalsObj>]: key extends keyof ForklaunchResponse<
    ResBodyMap,
    ResHeaders,
    LocalsObj
  >
    ? ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>[key]
    : ExpressResponse<LocalsObj>[key];
};

export type HyperExpressSchemaHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
> = HyperExpressHandler<
  SV,
  MapParamsSchema<SV, P>,
  MapResBodyMapSchema<SV, ResBodyMap>,
  MapReqBodySchema<SV, ReqBody>,
  MapReqQuerySchema<SV, ReqQuery>,
  MapReqHeadersSchema<SV, ReqHeaders>,
  MapResHeadersSchema<SV, ResHeaders>,
  LocalsObj
>;

export interface HyperExpressHandler<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> {
  (
    req: Request<SV, P, ReqBody, ReqQuery, ReqHeaders, LocalsObj>,
    res: Response<ResBodyMap, ResHeaders, LocalsObj>,
    next?: MiddlewareNext
  ): void | Promise<void>;
}
