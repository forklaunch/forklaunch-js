import { Prettify } from '@forklaunch/common';
import { AnySchemaValidator, Schema } from '@forklaunch/validator';
import { IdiomaticSchema, SchemaValidator } from '@forklaunch/validator/types';
import { IncomingHttpHeaders } from 'http';
import { ParsedQs } from 'qs';
import {
  HttpContractDetails,
  ParamsDictionary,
  PathParamHttpContractDetails
} from './primitive.types';

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
  P = ParamsDictionary,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Headers = IncomingHttpHeaders
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
  headers: Headers;
  /** Request body */
  body: ReqBody;
  /** Request query */
  query: ReqQuery;
}

/**
 * Interface representing a Forklaunch response.
 *
 * @template ResBody - A type for the response body, defaulting to common status code responses.
 * @template StatusCode - A type for the status code, defaulting to number.
 */
export interface ForklaunchResponse<
  ResBody = {
    400: unknown;
    401: unknown;
    403: unknown;
    500: unknown;
  },
  StatusCode = number,
  Headers = { 'x-correlation-id': string }
> {
  /** Data of the response body */
  bodyData: unknown;
  /** Status code of the response */
  statusCode: StatusCode;
  /** Whether the response is corked */
  corked: boolean;

  /**
   * Gets the headers of the response.
   * @returns {Headers} - The headers of the response.
   */
  getHeaders: () => Headers;

  /**
   * Sets a header for the response.
   * @param {string} key - The header key.
   * @param {string} value - The header value.
   */
  setHeader: <K extends keyof Headers>(key: K, value: Headers[K]) => void;

  /**
   * Sets the status of the response.
   * @param {U} code - The status code.
   * @param {string} [message] - Optional message.
   * @returns {ForklaunchResponse<ResBody[U], U>} - The response with the given status.
   */
  status: {
    <U extends keyof ResBody>(code: U): ForklaunchResponse<ResBody[U], U>;
    <U extends keyof ResBody>(
      code: U,
      message?: string
    ): ForklaunchResponse<ResBody[U], U>;
    <U extends 500>(code: U): ForklaunchResponse<string, U>;
    <U extends 500>(code: U, message?: string): ForklaunchResponse<string, U>;
  };

  /**
   * Sends the response.
   * @param {ResBody} [body] - The response body.
   * @param {boolean} [close_connection] - Whether to close the connection.
   * @returns {T} - The sent response.
   */
  send: {
    <T>(body?: ResBody, close_connection?: boolean): T;
    <T>(body?: ResBody): T;
  };

  /**
   * Sends a JSON response.
   * @param {ResBody} [body] - The response body.
   * @returns {boolean|T} - The JSON response.
   */
  json: {
    (body?: ResBody): boolean;
    <T>(body?: ResBody): T;
  };

  /**
   * Sends a JSONP response.
   * @param {ResBody} [body] - The response body.
   * @returns {boolean|T} - The JSONP response.
   */
  jsonp: {
    (body?: ResBody): boolean;
    <T>(body?: ResBody): T;
  };
}

/**
 * Type representing a mapped schema.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template T - A type that extends IdiomaticSchema or a valid schema object.
 */
export type MapSchema<
  SV extends AnySchemaValidator,
  T extends IdiomaticSchema<SV> | SV['_ValidSchemaObject']
> =
  Schema<T, SV> extends infer U
    ? { [key: string]: unknown } extends U
      ? unknown
      : U
    : never;

/**
 * Type representing the next function in a middleware.
 * @param {unknown} [err] - Optional error parameter.
 */
export type ForklaunchNextFunction = (err?: unknown) => void;
