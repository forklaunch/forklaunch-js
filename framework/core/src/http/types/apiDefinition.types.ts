import {
  MakePropertyOptionalIfChildrenOptional,
  Prettify,
  SanitizePathSlashes
} from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { Span } from '@opentelemetry/api';
import { JWTPayload } from 'jose';
import { ParsedQs } from 'qs';
import { Readable } from 'stream';
import { OpenTelemetryCollector } from '../telemetry/openTelemetryCollector';
import {
  AuthMethodsBase,
  BasicAuthMethods,
  Body,
  FileBody,
  HeadersObject,
  HttpContractDetails,
  JsonBody,
  MapSchema,
  Method,
  MultipartForm,
  ParamsDictionary,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponseBody,
  ResponseCompiledSchema,
  ResponsesObject,
  ServerSentEventBody,
  TextBody,
  UnknownBody,
  UnknownResponseBody,
  UrlEncodedForm
} from './contractDetails.types';
import { MetricsDefinition } from './openTelemetryCollector.types';

/**
 * Interface representing the context of a request.
 */
export interface RequestContext {
  /** Correlation ID for tracking requests */
  correlationId: string;
  /** Optional idempotency key for ensuring idempotent requests */
  idempotencyKey?: string;
  /** Active OpenTelemetry Span */
  span?: Span;
}

export interface ForklaunchBaseRequest<
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>
> {
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

  /** Request path */
  path: string;

  /** Original path */
  originalPath: string;

  /** OpenTelemetry Collector */
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
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

  /** Request parameters */
  params: P;
  /** Request headers */
  headers: ReqHeaders;
  /** Request body */
  body: ReqBody;
  /** Request query */
  query: ReqQuery;

  /** Contract details for the request */
  contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>;
  /** Schema validator */
  schemaValidator: SV;

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

  /** Request path */
  path: string;

  /** Request schema, compiled */
  requestSchema: unknown;

  /** Original path */
  originalPath: string;

  /** OpenTelemetry Collector */
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
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
    (
      body?: ResBody extends AsyncGenerator<unknown>
        ? never
        : ResBody extends Blob
          ? Blob | File | Buffer | ArrayBuffer | NodeJS.ReadableStream
          : ResBody | null,
      close_connection?: boolean
    ): boolean;
    <U>(
      body?: ResBody extends AsyncGenerator<unknown>
        ? never
        : ResBody extends Blob
          ? Blob | File | Buffer | ArrayBuffer | NodeJS.ReadableStream
          : ResBody | null,
      close_connection?: boolean
    ): U;
  };

  /**
   * Sends a JSON response.
   * @param {ResBodyMap} [body] - The response body.
   * @returns {boolean|T} - The JSON response.
   */
  json: {
    (
      body: ResBody extends string | AsyncGenerator<unknown>
        ? never
        : ResBody | null
    ): boolean;
    <U>(
      body: ResBody extends string | AsyncGenerator<unknown>
        ? never
        : ResBody | null
    ): U;
  };

  /**
   * Sends a JSONP response.
   * @param {ResBodyMap} [body] - The response body.
   * @returns {boolean|T} - The JSONP response.
   */
  jsonp: {
    (
      body: ResBody extends string | AsyncGenerator<unknown>
        ? never
        : ResBody | null
    ): boolean;
    <U>(
      body: ResBody extends string | AsyncGenerator<unknown>
        ? never
        : ResBody | null
    ): U;
  };

  /**
   * Sends a Server-Sent Event (SSE) response.
   * @param {ResBodyMap} [body] - The response body.
   * @param {number} interval - The interval between events.
   */
  sseEmitter: (
    generator: () => AsyncGenerator<
      ResBody extends AsyncGenerator<infer T> ? T : never,
      void,
      unknown
    >
  ) => void;
}

type ToNumber<T extends string | number | symbol> = T extends number
  ? T
  : T extends `${infer N extends number}`
    ? N
    : never;

/**
 * Interface representing a Forklaunch response.
 *
 * @template ResBodyMap - A type for the response body, defaulting to common status code responses.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface ForklaunchResponse<
  BaseResponse,
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
   * Gets a header for the response.
   * @param {string} key - The header key.
   * @returns {string | string[] | undefined} The header value.
   */
  getHeader: (key: string) => string | string[] | undefined;

  /**
   * Sets a header for the response.
   * @param {string} key - The header key.
   * @param {string} value - The header value.
   */
  setHeader: {
    <K extends keyof (ResHeaders & ForklaunchResHeaders)>(
      key: K,
      value: K extends keyof ForklaunchResHeaders
        ? ForklaunchResHeaders[K]
        : ResHeaders[K]
    ): void;
    <K extends keyof (ResHeaders & ForklaunchResHeaders)>(
      key: K,
      value: K extends keyof ForklaunchResHeaders
        ? ForklaunchResHeaders[K]
        : ResHeaders[K]
    ): BaseResponse;
  };

  /**
   * Adds an event listener to the response.
   * @param {string} event - The event to listen for.
   * @param {Function} listener - The listener function.
   */
  on(event: 'close', listener: () => void): BaseResponse & this;
  on(event: 'drain', listener: () => void): BaseResponse & this;
  on(event: 'error', listener: (err: Error) => void): BaseResponse & this;
  on(event: 'finish', listener: () => void): BaseResponse & this;
  on(event: 'pipe', listener: (src: Readable) => void): BaseResponse & this;
  on(event: 'unpipe', listener: (src: Readable) => void): BaseResponse & this;
  on(
    event: string | symbol,
    listener: (...args: unknown[]) => void
  ): BaseResponse & this;

  /**
   * Sets the status of the response.
   * @param {U} code - The status code.
   * @param {string} [message] - Optional message.
   * @returns {ForklaunchResponse<(ResBodyMap)[U], ResHeaders, U, LocalsObj>} - The response with the given status.
   */
  status: {
    <U extends ToNumber<keyof (ResBodyMap & ForklaunchResErrors)>>(
      code: U
    ): Omit<
      BaseResponse,
      keyof ForklaunchStatusResponse<
        (Omit<ForklaunchResErrors, keyof ResBodyMap> & ResBodyMap)[U]
      >
    > &
      ForklaunchStatusResponse<
        (Omit<ForklaunchResErrors, keyof ResBodyMap> & ResBodyMap)[U]
      >;
    <U extends ToNumber<keyof (ResBodyMap & ForklaunchResErrors)>>(
      code: U,
      message?: string
    ): Omit<
      BaseResponse,
      keyof ForklaunchStatusResponse<
        (Omit<ForklaunchResErrors, keyof ResBodyMap> & ResBodyMap)[U]
      >
    > &
      ForklaunchStatusResponse<
        (Omit<ForklaunchResErrors, keyof ResBodyMap> & ResBodyMap)[U]
      >;
  };

  /**
   * Ends the response.
   * @param {string} [data] - Optional data to send.
   */
  end: {
    (data?: string): void;
    (cb?: (() => void) | undefined): BaseResponse;
  };

  /**
   * Sets the content type of the response.
   * @param {string} type - The content type.
   */
  type: {
    (type: string): void;
    (type: string): BaseResponse;
  };

  /** Local variables */
  locals: LocalsObj;

  /** Cors */
  cors: boolean;

  /** Response schema, compiled */
  responseSchemas: ResponseCompiledSchema;

  /** Whether the metric has been recorded */
  metricRecorded: boolean;

  /** Whether the response has been sent */
  sent: boolean;
}

/**
 * Type representing the next function in a middleware.
 * @param {unknown} [err] - Optional error parameter.
 */
export type ForklaunchNextFunction = (err?: unknown) => void;

/**
 * Type representing the resolved forklaunch request from a base request type.
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ReqBody - A type for the request body, defaulting to Record<string, unknown>.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template ReqHeaders - A type for the request headers, defaulting to Record<string, string>.
 * @template BaseRequest - A type for the base request.
 */
export type ResolvedForklaunchRequest<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  BaseRequest
> = unknown extends BaseRequest
  ? ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>
  : {
      [key in keyof BaseRequest]: key extends keyof ForklaunchRequest<
        SV,
        P,
        ReqBody,
        ReqQuery,
        ReqHeaders
      >
        ? ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>[key]
        : key extends keyof BaseRequest
          ? BaseRequest[key]
          : never;
    };

export type ResolvedForklaunchAuthRequest<
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  BaseRequest
> = unknown extends BaseRequest
  ? ForklaunchBaseRequest<P, ReqBody, ReqQuery, ReqHeaders>
  : {
      [key in keyof BaseRequest]: key extends keyof ForklaunchBaseRequest<
        P,
        ReqBody,
        ReqQuery,
        ReqHeaders
      >
        ? ForklaunchBaseRequest<P, ReqBody, ReqQuery, ReqHeaders>[key]
        : key extends keyof BaseRequest
          ? BaseRequest[key]
          : never;
    };

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
export interface ExpressLikeHandler<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>,
  BaseRequest,
  BaseResponse,
  NextFunction
> {
  (
    req: ResolvedForklaunchRequest<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      BaseRequest
    >,
    res: unknown extends BaseResponse
      ? ForklaunchResponse<BaseResponse, ResBodyMap, ResHeaders, LocalsObj>
      : {
          [key in keyof BaseResponse]: key extends keyof ForklaunchResponse<
            BaseResponse,
            ResBodyMap,
            ResHeaders,
            LocalsObj
          >
            ? ForklaunchResponse<
                BaseResponse,
                ResBodyMap,
                ResHeaders,
                LocalsObj
              >[key]
            : key extends keyof BaseResponse
              ? BaseResponse[key]
              : never;
        },
    next: NextFunction
  ): unknown;
}

export type MapParamsSchema<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>
> =
  MapSchema<SV, P> extends infer Params
    ? unknown extends Params
      ? ParamsDictionary
      : Params
    : ParamsDictionary;

export type ExtractContentType<
  SV extends AnySchemaValidator,
  T extends ResponseBody<SV> | unknown
> = T extends { contentType: string }
  ? T['contentType']
  : T extends JsonBody<SV>
    ? 'application/json'
    : T extends TextBody<SV>
      ? 'text/plain'
      : T extends FileBody<SV>
        ? 'application/octet-stream'
        : T extends ServerSentEventBody<SV>
          ? 'text/event-stream'
          : T extends UnknownResponseBody<SV>
            ? 'application/json'
            : T extends SV['file']
              ? 'application/octet-stream'
              : 'text/plain';

export type ExtractResponseBody<
  SV extends AnySchemaValidator,
  T extends ResponseBody<SV> | unknown
> =
  T extends JsonBody<SV>
    ? MapSchema<SV, T['json']>
    : T extends TextBody<SV>
      ? MapSchema<SV, T['text']>
      : T extends FileBody<SV>
        ? File | Blob
        : T extends ServerSentEventBody<SV>
          ? AsyncGenerator<MapSchema<SV, T['event']>>
          : T extends UnknownResponseBody<SV>
            ? MapSchema<SV, T['schema']>
            : MapSchema<SV, T>;

export type MapResBodyMapSchema<
  SV extends AnySchemaValidator,
  ResBodyMap extends ResponsesObject<SV>
> = unknown extends ResBodyMap
  ? ForklaunchResErrors
  : {
      [K in keyof ResBodyMap]: ExtractResponseBody<SV, ResBodyMap[K]>;
    };

export type ExtractBody<SV extends AnySchemaValidator, T extends Body<SV>> =
  T extends JsonBody<SV>
    ? T['json']
    : T extends TextBody<SV>
      ? T['text']
      : T extends FileBody<SV>
        ? T['file']
        : T extends MultipartForm<SV>
          ? T['multipartForm']
          : T extends UrlEncodedForm<SV>
            ? T['urlEncodedForm']
            : T extends UnknownBody<SV>
              ? T['schema']
              : T;

export type MapReqBodySchema<
  SV extends AnySchemaValidator,
  ReqBody extends Body<SV>
> =
  MapSchema<SV, ExtractBody<SV, ReqBody>> extends infer Body
    ? unknown extends Body
      ? Record<string, unknown>
      : Body
    : Record<string, unknown>;

export type MapReqQuerySchema<
  SV extends AnySchemaValidator,
  ReqQuery extends QueryObject<SV>
> =
  MapSchema<SV, ReqQuery> extends infer Query
    ? unknown extends Query
      ? ParsedQs
      : Query
    : ParsedQs;

export type MapReqHeadersSchema<
  SV extends AnySchemaValidator,
  ReqHeaders extends HeadersObject<SV>
> =
  MapSchema<SV, ReqHeaders> extends infer RequestHeaders
    ? unknown extends RequestHeaders
      ? Record<string, string>
      : RequestHeaders
    : Record<string, string>;

export type MapResHeadersSchema<
  SV extends AnySchemaValidator,
  ResHeaders extends HeadersObject<SV>
> =
  MapSchema<SV, ResHeaders> extends infer ResponseHeaders
    ? unknown extends ResponseHeaders
      ? ForklaunchResHeaders
      : ResponseHeaders
    : ForklaunchResHeaders;

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
export type ExpressLikeSchemaHandler<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  BaseRequest,
  BaseResponse,
  NextFunction
> = ExpressLikeHandler<
  SV,
  MapParamsSchema<SV, P>,
  MapResBodyMapSchema<SV, ResBodyMap>,
  MapReqBodySchema<SV, ReqBody>,
  MapReqQuerySchema<SV, ReqQuery>,
  MapReqHeadersSchema<SV, ReqHeaders>,
  MapResHeadersSchema<SV, ResHeaders>,
  LocalsObj,
  BaseRequest,
  BaseResponse,
  NextFunction
>;

/**
 * Represents a function that maps an authenticated request with schema validation
 * to a set of authorization strings, with request properties automatically inferred from the schema.
 *
 * @template SV - The type representing the schema validator.
 * @template P - The type representing request parameters inferred from the schema.
 * @template ReqBody - The type representing the request body inferred from the schema.
 * @template ReqQuery - The type representing the request query parameters inferred from the schema.
 * @template ReqHeaders - The type representing the request headers inferred from the schema.
 *
 * @param {ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>} req - The request object with schema validation.
 * @returns {Set<string> | Promise<Set<string>>} - A set of authorization strings or a promise that resolves to it.
 */
export type ExpressLikeSchemaAuthMapper<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  BaseRequest
> = ExpressLikeAuthMapper<
  SV,
  P extends infer UnmappedParams
    ? UnmappedParams extends ParamsObject<SV>
      ? MapParamsSchema<SV, UnmappedParams>
      : never
    : never,
  ReqBody extends infer UnmappedReqBody
    ? UnmappedReqBody extends Body<SV>
      ? MapReqBodySchema<SV, UnmappedReqBody>
      : never
    : never,
  ReqQuery extends infer UnmappedReqQuery
    ? UnmappedReqQuery extends QueryObject<SV>
      ? MapReqQuerySchema<SV, UnmappedReqQuery>
      : never
    : never,
  ReqHeaders extends infer UnmappedReqHeaders
    ? UnmappedReqHeaders extends HeadersObject<SV>
      ? MapReqHeadersSchema<SV, UnmappedReqHeaders>
      : never
    : never,
  BaseRequest
>;

export type ExpressLikeAuthMapper<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  BaseRequest
> = (
  payload: JWTPayload,
  req?: ResolvedForklaunchRequest<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    BaseRequest
  >
) => Set<string> | Promise<Set<string>>;

type TokenPrefix<Auth extends AuthMethodsBase> =
  undefined extends Auth['tokenPrefix']
    ? Auth extends BasicAuthMethods
      ? 'Basic '
      : 'Bearer '
    : `${Auth['tokenPrefix']} `;

type AuthHeaders<Auth extends AuthMethodsBase> =
  undefined extends Auth['headerName']
    ? {
        authorization: `${TokenPrefix<Auth>}${string}`;
      }
    : {
        [K in NonNullable<Auth['headerName']>]: `${TokenPrefix<Auth>}${string}`;
      };

export type LiveTypeFunctionRequestInit<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  Auth extends AuthMethodsBase
> = MakePropertyOptionalIfChildrenOptional<
  (ParamsObject<SV> extends P
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
      ? AuthHeaders<AuthMethodsBase> extends AuthHeaders<Auth>
        ? unknown
        : {
            headers: AuthHeaders<Auth>;
          }
      : AuthHeaders<AuthMethodsBase> extends AuthHeaders<Auth>
        ? { headers: MapSchema<SV, ReqHeaders> }
        : {
            headers: MapSchema<SV, ReqHeaders> & AuthHeaders<Auth>;
          })
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
  ResHeaders extends HeadersObject<SV>,
  ContractMethod extends Method,
  Auth extends AuthMethodsBase
> = (
  route: SanitizePathSlashes<Route>,
  ...reqInit: Prettify<
    Omit<RequestInit, 'method' | 'body' | 'query' | 'headers' | 'params'> & {
      method: Uppercase<ContractMethod>;
    } & LiveTypeFunctionRequestInit<SV, P, ReqBody, ReqQuery, ReqHeaders, Auth>
  > extends infer ReqInit
    ? ReqInit extends
        | { body: unknown }
        | { params: unknown }
        | { query: unknown }
        | { headers: unknown }
      ? [reqInit: ReqInit]
      : [reqInit?: ReqInit]
    : never
) => Promise<
  Prettify<
    SdkResponse<
      SV,
      ResponsesObject<SV> extends ResBodyMap
        ? Record<number, unknown>
        : ResBodyMap,
      ForklaunchResHeaders extends ResHeaders
        ? unknown
        : MapSchema<SV, ResHeaders>
    >
  >
>;

/**
 * Represents a live type function for the SDK.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters.
 * @template ResBodyMap - A type for response schemas.
 * @template ReqBody - A type for the request body.
 * @template ReqQuery - A type for the request query.
 * @template ReqHeaders - A type for the request headers.
 * @template ResHeaders - A type for the response headers.
 *
 */
export type LiveSdkFunction<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  Auth extends AuthMethodsBase
> = (
  ...reqInit: Prettify<
    Omit<RequestInit, 'method' | 'body' | 'query' | 'headers' | 'params'> &
      LiveTypeFunctionRequestInit<SV, P, ReqBody, ReqQuery, ReqHeaders, Auth>
  > extends infer ReqInit
    ? ReqInit extends
        | { body: unknown }
        | { params: unknown }
        | { query: unknown }
        | { headers: unknown }
      ? [reqInit: ReqInit]
      : [reqInit?: ReqInit]
    : never
) => Promise<
  Prettify<
    SdkResponse<
      SV,
      ResponsesObject<SV> extends ResBodyMap
        ? Record<number, unknown>
        : ResBodyMap,
      ForklaunchResHeaders extends ResHeaders
        ? unknown
        : MapSchema<SV, ResHeaders>
    >
  >
>;

/**
 * Represents a basic SDK Response object.
 *
 * @template ResBodyMap - A type for the response body.
 * @template ResHeaders - A type for the response headers.
 */
type SdkResponse<
  SV extends AnySchemaValidator,
  ResBodyMap extends Record<number, unknown>,
  ResHeaders extends Record<string, string> | unknown
> = Prettify<
  ({
    [K in keyof ForklaunchResErrors]: {
      code: K;
      contentType: 'text/plain';
      response: ForklaunchResErrors[K];
    };
  } & {
    [K in keyof ResBodyMap]: {
      code: K;
      contentType: ExtractContentType<SV, ResBodyMap[K]>;
      response: ExtractResponseBody<SV, ResBodyMap[K]>;
    } & (unknown extends ResHeaders ? unknown : { headers: ResHeaders });
  })[keyof (ForklaunchResErrors & ResBodyMap)]
>;

/**
 * Represents the default error types for responses.
 */
export type ForklaunchResErrors<
  BadRequest = string,
  Unauthorized = string,
  NotFound = string,
  Forbidden = string,
  InternalServerErrorType = string
> = {
  400: BadRequest;
  401: Unauthorized;
  404: NotFound;
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

/**
 * Represents a path match.
 */
export type PathMatch<
  SuppliedPath extends `/${string}`,
  ActualPath extends `/${string}`
> = ActualPath extends SuppliedPath
  ? SuppliedPath extends ActualPath
    ? SuppliedPath
    : never
  : never;
