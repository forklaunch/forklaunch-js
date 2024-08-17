import { Prettify } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { SchemaValidator } from '@forklaunch/validator/types';
import { ParsedQs } from 'qs';
import {
  Body,
  HeadersObject,
  HttpContractDetails,
  MapSchema,
  ParamsDictionary,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponseCompiledSchema,
  ResponsesObject
} from './contractDetails.types';

/**
 * Interface representing the context of a request.
 */
export interface RequestContext {
  /** Correlation ID for tracking requests */
  correlationId: string;
  /** Optional idempotency key for ensuring idempotent requests */
  idempotencyKey?: string;
}

/**
 * Interface representing a Forklaunch request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template Headers - A type for the request headers, defaulting to IncomingHttpHeaders.
 */
export interface ForklaunchRequest<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>
> {
  /** Context of the request */
  context: Prettify<RequestContext>;
  /** Contract details for the request */
  contractDetails: HttpContractDetails<SV> | PathParamHttpContractDetails<SV>;
  /** Schema validator */
  schemaValidator: SchemaValidator;

  /** Request parameters */
  params: P;
  /** Request headers */
  headers: ReqHeaders;
  /** Request body */
  body: ReqBody;
  /** Request query */
  query: ReqQuery;

  /** Method */
  method:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE'
    | 'OPTIONS'
    | 'HEAD'
    | 'CONNECT'
    | 'TRACE';

  /** Request schema, compiled */
  requestSchema: unknown;
}

/**
 * Represents the types of data that can be sent in a response.
 */
export type ForklaunchSendableData =
  | Record<string, unknown>
  | string
  | Buffer
  | ArrayBuffer
  | NodeJS.ReadableStream
  | null
  | undefined;

/**
 * Interface representing a Forklaunch response status.
 * @template ResBody - A type for the response body.
 */
export interface ForklaunchStatusResponse<ResBody> {
  /**
   * Sends the response.
   * @param {ResBodyMap} [body] - The response body.
   * @param {boolean} [close_connection] - Whether to close the connection.
   * @returns {T} - The sent response.
   */
  send: {
    <T>(body?: ResBody, close_connection?: boolean): T;
    <T>(body?: ResBody): T;
  };

  /**
   * Sends a JSON response.
   * @param {ResBodyMap} [body] - The response body.
   * @returns {boolean|T} - The JSON response.
   */
  json: {
    (body?: ResBody): boolean;
    <T>(body?: ResBody): T;
  };

  /**
   * Sends a JSONP response.
   * @param {ResBodyMap} [body] - The response body.
   * @returns {boolean|T} - The JSONP response.
   */
  jsonp: {
    (body?: ResBody): boolean;
    <T>(body?: ResBody): T;
  };
}

/**
 * Interface representing a Forklaunch response.
 *
 * @template ResBodyMap - A type for the response body, defaulting to common status code responses.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface ForklaunchResponse<
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
> {
  /** Data of the response body */
  bodyData: unknown;
  /** Status code of the response */
  statusCode: number;
  /** Whether the response is finished */
  headersSent: boolean;

  /**
   * Gets the headers of the response.
   * @returns {Omit<ResHeaders, keyof ForklaunchResHeaders> & ForklaunchResHeaders} - The headers of the response.
   */
  getHeaders: () => Omit<ResHeaders, keyof ForklaunchResHeaders> &
    ForklaunchResHeaders;

  /**
   * Sets a header for the response.
   * @param {string} key - The header key.
   * @param {string} value - The header value.
   */
  setHeader: <K extends keyof (ResHeaders & ForklaunchResHeaders)>(
    key: K,
    value: K extends keyof ForklaunchResHeaders
      ? ForklaunchResHeaders[K]
      : ResHeaders[K]
  ) => void;

  /**
   * Sets the status of the response.
   * @param {U} code - The status code.
   * @param {string} [message] - Optional message.
   * @returns {ForklaunchResponse<(ResBodyMap)[U], ResHeaders, U, LocalsObj>} - The response with the given status.
   */
  status: {
    <U extends keyof (ResBodyMap & ForklaunchResErrors)>(
      code: U
    ): ForklaunchStatusResponse<
      (Omit<ForklaunchResErrors, keyof ResBodyMap> & ResBodyMap)[U]
    >;
    <U extends keyof (ResBodyMap & ForklaunchResErrors)>(
      code: U,
      message?: string
    ): ForklaunchStatusResponse<
      (Omit<ForklaunchResErrors, keyof ResBodyMap> & ResBodyMap)[U]
    >;
  };

  /**
   * Ends the response.
   * @param {string} [data] - Optional data to send.
   */
  end: (data?: string) => void;

  /** Local variables */
  locals: LocalsObj;

  /** Cors */
  cors: boolean;

  /** Response schema, compiled */
  responseSchemas: ResponseCompiledSchema;
}

/**
 * Type representing the next function in a middleware.
 * @param {unknown} [err] - Optional error parameter.
 */
export type ForklaunchNextFunction = (err?: unknown) => void;

/**
 * Represents a middleware handler with schema validation.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface ForklaunchMiddlewareHandler<
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
    req: ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
    res: ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>,
    next?: ForklaunchNextFunction
  ): void | Promise<void>;
}

/**
 * Represents a schema middleware handler with typed parameters, responses, body, and query.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResBodyMap - A type for response schemas, defaulting to ResponsesObject.
 * @template ReqBody - A type for the request body, defaulting to Body.
 * @template ReqQuery - A type for the request query, defaulting to QueryObject.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 */
export type ForklaunchSchemaMiddlewareHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV> | unknown,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
> = ForklaunchMiddlewareHandler<
  SV,
  MapSchema<SV, P> extends infer Params
    ? unknown extends Params
      ? ParamsDictionary
      : Params
    : ParamsDictionary,
  MapSchema<SV, ResBodyMap> extends infer ResponseBodyMap
    ? unknown extends ResponseBodyMap
      ? ForklaunchResErrors
      : ResponseBodyMap
    : ForklaunchResErrors,
  MapSchema<SV, ReqBody> extends infer Body
    ? unknown extends Body
      ? Record<string, unknown>
      : Body
    : Record<string, unknown>,
  MapSchema<SV, ReqQuery> extends infer Query
    ? unknown extends Query
      ? ParsedQs
      : Query
    : ParsedQs,
  MapSchema<SV, ReqHeaders> extends infer RequestHeaders
    ? unknown extends RequestHeaders
      ? Record<string, string>
      : RequestHeaders
    : Record<string, string>,
  MapSchema<SV, ResHeaders> extends infer ResponseHeaders
    ? unknown extends ResponseHeaders
      ? ForklaunchResHeaders
      : ResponseHeaders
    : ForklaunchResHeaders,
  LocalsObj
>;

/**
 * Represents a live type function for the SDK.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Path - A type for the route path.
 * @template P - A type for request parameters.
 * @template ResBodyMap - A type for response schemas.
 * @template ReqBody - A type for the request body.
 * @template ReqQuery - A type for the request query.
 * @template ReqHeaders - A type for the request headers.
 * @template ResHeaders - A type for the response headers.
 *
 */
export type LiveTypeFunction<
  SV extends AnySchemaValidator,
  Route extends string,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>
> = (ParamsObject<SV> extends P
  ? unknown
  : {
      params: MapSchema<SV, P>;
    }) &
  (Body<SV> extends ReqBody
    ? unknown
    : {
        body: MapSchema<SV, ReqBody>;
      }) &
  (QueryObject<SV> extends ReqQuery
    ? unknown
    : {
        query: MapSchema<SV, ReqQuery>;
      }) &
  (HeadersObject<SV> extends ReqHeaders
    ? unknown
    : {
        headers: MapSchema<SV, ReqHeaders>;
      }) extends infer Request
  ? SdkResponse<
      ForklaunchResErrors &
        (HeadersObject<SV> extends ResBodyMap
          ? unknown
          : MapSchema<SV, ResBodyMap>),
      ForklaunchResHeaders extends ResHeaders
        ? unknown
        : MapSchema<SV, ResHeaders>
    > extends infer Return
    ? unknown extends Request
      ? (route: Route) => Promise<Return>
      : (route: Route, request: Request) => Promise<Return>
    : never
  : never;

/**
 * Represents a basic SDK Response object.
 *
 * @template ResBodyMap - A type for the response body.
 * @template ResHeaders - A type for the response headers.
 */
type SdkResponse<
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string> | unknown
> = Prettify<
  {
    [key in keyof ResBodyMap]: {
      code: key;
      response: ResBodyMap[key];
    } & (unknown extends ResHeaders ? unknown : { headers: ResHeaders });
  }[keyof ResBodyMap]
>;

/**
 * Represents the default error types for responses.
 */
export type ForklaunchResErrors<
  BadRequest = string,
  Unauthorized = string,
  Forbidden = string,
  InternalServerErrorType = string
> = {
  400: BadRequest;
  401: Unauthorized;
  403: Forbidden;
  500: InternalServerErrorType;
};

/**
 * Represents the default header types for responses.
 */
export type ForklaunchResHeaders = { 'x-correlation-id': string };

/**
 * Represents the default error types for responses.
 */
export type ErrorContainer<Code extends number> = {
  /** The error code */
  code: Code;
  /** The error message */
  error: string;
};

/**
 * Represents a parsed response shape.
 */
export type ResponseShape<Params, Headers, Query, Body> = {
  params: Params;
  headers: Headers;
  query: Query;
  body: Body;
};