import { AnySchemaValidator } from '@forklaunch/validator';
import { UnboxedObjectSchema } from '@forklaunch/validator/types';

/**
 * Dictionary type for URL parameters.
 */
export type ParamsDictionary = { [key: string]: string };

/**
 * Type representing an object with only string keys.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type StringOnlyObject<SV extends AnySchemaValidator> = Omit<
  UnboxedObjectSchema<SV>,
  number | symbol
>;

/**
 * Type representing an object with only number keys.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type NumberOnlyObject<SV extends AnySchemaValidator> = Omit<
  UnboxedObjectSchema<SV>,
  string | symbol
>;

/**
 * Type representing the body object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type BodyObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> &
  unknown;

/**
 * Type representing the parameters object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type ParamsObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> &
  unknown;

/**
 * Type representing the query object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type QueryObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> &
  unknown;

/**
 * Type representing the headers object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type HeadersObject<SV extends AnySchemaValidator> =
  StringOnlyObject<SV> & unknown;

/**
 * Type representing the responses object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type ResponsesObject<SV extends AnySchemaValidator> = {
  [key: number]:
    | SV['_ValidSchemaObject']
    | UnboxedObjectSchema<SV>
    | string
    | SV['string'];
} & unknown;

/**
 * Type representing the body in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type Body<SV extends AnySchemaValidator> =
  | BodyObject<SV>
  | SV['_ValidSchemaObject']
  | SV['_SchemaCatchall'];

/**
 * Type representing the authentication method.
 */
export type AuthMethod = 'jwt' | 'session';

/**
 * Interface representing HTTP contract details for path parameters.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template ParamsSchema - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResponseSchemas - A type for response schemas, defaulting to ResponsesObject.
 * @template QuerySchema - A type for query schemas, defaulting to QueryObject.
 */
export interface PathParamHttpContractDetails<
  SV extends AnySchemaValidator,
  ParamsSchema extends ParamsObject<SV> = ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
  QuerySchema extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>
> {
  /** Name of the contract */
  name: string;
  /** Summary of the contract */
  summary: string;
  /** Response schemas for the contract */
  responses: ResponseSchemas;
  /** Optional request headers for the contract */
  requestHeaders?: ReqHeaders;
  /** Optional response headers for the contract */
  responseHeaders?: ResHeaders;
  /** Optional parameter schemas for the contract */
  params?: ParamsSchema;
  /** Optional query schemas for the contract */
  query?: QuerySchema;
  /** Optional authentication details for the contract */
  auth?: {
    method: AuthMethod;
    allowedSlugs?: Set<string>;
    forbiddenSlugs?: Set<string>;
    allowedRoles?: Set<string>;
    forbiddenRoles?: Set<string>;
  };
}

/**
 * Interface representing HTTP contract details.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template ParamsSchema - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResponseSchemas - A type for response schemas, defaulting to ResponsesObject.
 * @template BodySchema - A type for the body schema, defaulting to Body.
 * @template QuerySchema - A type for query schemas, defaulting to QueryObject.
 */
export interface HttpContractDetails<
  SV extends AnySchemaValidator,
  ParamsSchema extends ParamsObject<SV> = ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
  BodySchema extends Body<SV> = Body<SV>,
  QuerySchema extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>
> extends PathParamHttpContractDetails<
    SV,
    ParamsSchema,
    ResponseSchemas,
    QuerySchema,
    ReqHeaders,
    ResHeaders
  > {
  /** Required body schema for the contract */
  body: BodySchema;
  /** Optional content type for the contract */
  contentType?:
    | 'application/json'
    | 'multipart/form-data'
    | 'application/x-www-form-urlencoded';
}

/**
 * Represents the path parameter methods.
 */
export type PathParameterMethod = 'get' | 'delete' | 'options';

/**
 * Represents the body parameter methods.
 */
export type HttpMethod = 'post' | 'patch' | 'put';

/**
 * Represents all supported typed methods.
 */
export type Method = PathParameterMethod | HttpMethod;
