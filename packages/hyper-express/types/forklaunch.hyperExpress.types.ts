import { FlattenKeys, Prettify } from '@forklaunch/common';
import {
  Body,
  ForklaunchRequest,
  ForklaunchResponse,
  HeadersObject,
  MapSchema,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '@forklaunch/core';
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
export interface Request<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  RequestHeaders = Record<string, string>,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> extends ForklaunchRequest<SV, P, ReqBody, ReqQuery, RequestHeaders>,
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
  ResponseHeaders = Record<string, string> & { 'x-correlation-id': string },
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
> extends ForklaunchResponse<ResBody, StatusCode, ResponseHeaders>,
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
  RequestHeaders = Record<string, string>,
  ResponseHeaders = Record<string, string> & { 'x-correlation-id': string },
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
> {
  (
    req: Request<SV, P, ReqBody, ReqQuery, RequestHeaders, LocalsObj>,
    res: Response<ResBody, ResponseHeaders, LocalsObj, StatusCode>,
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
  RequestHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResponseHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>
> = MiddlewareHandler<
  SV,
  MapSchema<SV, P>,
  MapSchema<SV, ResBody> & ResErrorTypes,
  MapSchema<SV, ReqBody>,
  MapSchema<SV, ReqQuery>,
  MapSchema<SV, RequestHeaders>,
  MapSchema<SV, ResponseHeaders>,
  LocalsObj,
  FlattenKeys<ResBody> & number
>;

/**
 * Represents a live type function for the SDK.
 * 
 * @template SV - A type that extends AnySchemaValidator.
 * @template Path - A type for the route path.
 * @template P - A type for request parameters.
 * @template ResBody - A type for response schemas.
 * @template ReqBody - A type for the request body.
 * @template ReqQuery - A type for the request query.
 * @template RequestHeaders - A type for the request headers.
 * @template ResponseHeaders - A type for the response headers.
 * 
 */
export type LiveTypeFunction<
    SV extends AnySchemaValidator,
    Route extends string,
    P extends ParamsObject<SV>,
    ResBody extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    RequestHeaders extends HeadersObject<SV>,
    ResponseHeaders extends HeadersObject<SV>
> = (MapSchema<SV, P> extends infer Params ? unknown extends Params ? unknown : {
      params: Params
    } : unknown) &
    (MapSchema<SV, ReqBody> extends infer Body ? unknown extends Body ? unknown : {
      body: Body
    } : unknown) &
    (MapSchema<SV, ReqQuery> extends infer Query ? unknown extends Query ? unknown : {
      query: Query
    } : unknown) & (MapSchema<SV, RequestHeaders> extends infer ReqHeaders ? unknown extends ReqHeaders ? unknown : {
      headers: ReqHeaders;
    }: unknown) extends infer Request ? SdkResponse<
      (MapSchema<SV, ResBody> extends infer Response ? unknown extends Response ? unknown : Response : unknown) & ResErrorTypes, 
      (MapSchema<SV, ResponseHeaders> extends infer ResHeaders ? unknown extends ResHeaders ? unknown : ResHeaders : unknown)
    > extends infer Return ? unknown extends Request ? (route: Route) => Promise<Return> : 
    (route: Route, request: Request) => Promise<Return> : never : never;

/**
 * Represents a basic SDK Response object.
 * 
 * @template ResBody - A type for the response body.
 * @template ResponseHeaders - A type for the response headers.
 */
type SdkResponse<ResBody extends Record<number, unknown>, ResponseHeaders extends Record<string, string> | unknown> = Prettify<{
  [key in keyof ResBody]: {
    code: key,
    response: ResBody[key];
  } & (unknown extends ResponseHeaders ? unknown : { headers: ResponseHeaders });
}[keyof ResBody]>;

/**
 * Represents the error types for responses.
 */
export type ResErrorTypes = {
  400: string;
  500: string;
};
