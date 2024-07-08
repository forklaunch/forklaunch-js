import { Prettify } from '@forklaunch/common';
import {
  AnySchemaValidator,
  Schema,
  SchemaValidator
} from '@forklaunch/validator';
import { IdiomaticSchema } from '@forklaunch/validator/types';
import { IncomingHttpHeaders, OutgoingHttpHeader } from 'http';
import { ParsedQs } from 'qs';
import {
  HttpContractDetails,
  ParamsDictionary,
  PathParamHttpContractDetails
} from './primitive.types';

export interface RequestContext {
  correlationId: string;
  idempotencyKey?: string;
}

export interface ForklaunchRequest<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Headers = IncomingHttpHeaders
> {
  context: Prettify<RequestContext>;
  contractDetails: HttpContractDetails<SV> | PathParamHttpContractDetails<SV>;
  schemaValidator: SchemaValidator;

  params: P;
  headers: Headers;
  body: ReqBody;
  query: ReqQuery;
}

export interface ForklaunchResponse<
  ResBody = {
    400: unknown;
    401: unknown;
    403: unknown;
    500: unknown;
  },
  StatusCode = number
> {
  bodyData: unknown;
  statusCode: StatusCode;
  corked: boolean;

  getHeaders: () => OutgoingHttpHeader;
  setHeader: (key: string, value: string) => void;
  status: {
    <U extends keyof ResBody>(code: U): ForklaunchResponse<ResBody[U], U>;
    <U extends keyof ResBody>(
      code: U,
      message?: string
    ): ForklaunchResponse<ResBody[U], U>;
    <U extends 500>(code: U): ForklaunchResponse<string, U>;
    <U extends 500>(code: U, message?: string): ForklaunchResponse<string, U>;
  };
  send: {
    <T>(body?: ResBody, close_connection?: boolean): T;
    <T>(body?: ResBody): T;
  };
  json: {
    (body?: ResBody): boolean;
    <T>(body?: ResBody): T;
  };
  jsonp: {
    (body?: ResBody): boolean;
    <T>(body?: ResBody): T;
  };
}
export type MapSchema<
  SV extends AnySchemaValidator,
  T extends IdiomaticSchema<SV> | SV['_ValidSchemaObject']
> =
  Schema<T, SV> extends infer U
    ? { [key: string]: unknown } extends U
      ? never
      : U
    : never;
export type ForklaunchNextFunction = (err?: unknown) => void;
