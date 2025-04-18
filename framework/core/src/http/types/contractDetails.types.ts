import { Prettify } from '@forklaunch/common';
import {
  AnySchemaValidator,
  IdiomaticSchema,
  Schema,
  UnboxedObjectSchema
} from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import {
  ExpressLikeAuthMapper,
  ExpressLikeSchemaAuthMapper
} from './apiDefinition.types';

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

export type AuthMethodsBase = (
  | {
      readonly method: 'jwt';
    }
  | {
      readonly method: 'basic';
      readonly login: (username: string, password: string) => boolean;
    }
  | {
      readonly method: 'other';
      readonly tokenPrefix: string;
      readonly headerName?: string;
      readonly decodeResource: (token: string) => string;
    }
) &
  (
    | {
        readonly allowedPermissions: Set<string>;
        readonly forbiddenPermissions?: Set<string>;
        readonly allowedRoles?: Set<string>;
        readonly forbiddenRoles?: Set<string>;
      }
    | {
        readonly allowedPermissions?: Set<string>;
        readonly forbiddenPermissions: Set<string>;
        readonly allowedRoles?: Set<string>;
        readonly forbiddenRoles?: Set<string>;
      }
    | {
        readonly allowedPermissions?: Set<string>;
        readonly forbiddenPermissions?: Set<string>;
        readonly allowedRoles: Set<string>;
        readonly forbiddenRoles?: Set<string>;
      }
    | {
        readonly allowedPermissions?: Set<string>;
        readonly forbiddenPermissions?: Set<string>;
        readonly allowedRoles?: Set<string>;
        readonly forbiddenRoles: Set<string>;
      }
  );

/**
 * Type representing the authentication methods.
 */
export type SchemaAuthMethods<
  SV extends AnySchemaValidator,
  ParamsSchema extends ParamsObject<SV>,
  ReqBody extends Body<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  BaseRequest
> = Prettify<
  AuthMethodsBase & {
    readonly mapPermissions?: ExpressLikeSchemaAuthMapper<
      SV,
      ParamsSchema,
      ReqBody,
      QuerySchema,
      ReqHeaders,
      BaseRequest
    >;
    readonly mapRoles?: ExpressLikeSchemaAuthMapper<
      SV,
      ParamsSchema,
      ReqBody,
      QuerySchema,
      ReqHeaders,
      BaseRequest
    >;
  }
>;

export type AuthMethods<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  BaseRequest
> = AuthMethodsBase & {
  readonly mapPermissions?: ExpressLikeAuthMapper<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    BaseRequest
  >;
  readonly mapRoles?: ExpressLikeAuthMapper<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    BaseRequest
  >;
};

/**
 * Type representing a mapped schema.
 *s ParamsDictionary,
//   ReqBody extends Record<string, unknown>,
// 
 * @template SV - A type that extends AnySchemaValidator.
 * @template T - A type that extends IdiomaticSchema or a valid schema object.
 */
export type MapSchema<
  SV extends AnySchemaValidator,
  T extends IdiomaticSchema<SV> | SV['_ValidSchemaObject']
> = Schema<T, SV> extends infer U ? (T extends U ? unknown : U) : never;

/**
 * Type representing the parameters in a request.
 */
type ExtractParams<Path extends `/${string}`> =
  Path extends `${string}/:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : Path extends `${string}/:${infer Param}`
      ? Param
      : never;

/**
 * Type representing the parameters in a request.
 */
export type ExtractedParamsObject<Path extends `/${string}`> = Record<
  ExtractParams<Path>,
  unknown
>;

/**
 * Represents the path parameter methods.
 */
export type PathParamMethod = 'get' | 'delete' | 'options' | 'head' | 'trace';

/**
 * Represents the body parameter methods.
 */
export type HttpMethod = 'post' | 'patch' | 'put';

/**
 * Represents all supported typed methods.
 */
export type Method = PathParamMethod | HttpMethod | 'middleware';

/**
 * Interface representing a compiled schema for a response.
 */
export type ResponseCompiledSchema = {
  headers?: unknown;
  responses: Record<number, unknown>;
};

/**
 * Interface representing HTTP contract details for path parameters.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template ParamsSchema - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResponseSchemas - A type for response schemas, defaulting to ResponsesObject.
 * @template QuerySchema - A type for query schemas, defaulting to QueryObject.
 */
export type PathParamHttpContractDetails<
  SV extends AnySchemaValidator,
  Path extends `/${string}` = `/${string}`,
  ParamsSchema extends ParamsObject<SV> = ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
  QuerySchema extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  BaseRequest = unknown
> = {
  /** Name of the contract */
  readonly name: string;
  /** Summary of the contract */
  readonly summary: string;
  /** Response schemas for the contract */
  readonly responses: ResponseSchemas;
  /** Optional request headers for the contract */
  readonly requestHeaders?: ReqHeaders;
  /** Optional response headers for the contract */
  readonly responseHeaders?: ResHeaders;
  /** Optional query schemas for the contract */
  readonly query?: QuerySchema;
  /** Optional authentication details for the contract */
  readonly auth?: SchemaAuthMethods<
    SV,
    string | number | symbol extends ExtractedParamsObject<Path>
      ? {
          [K in keyof ExtractedParamsObject<Path>]: ParamsSchema[K];
        }
      : ParamsSchema,
    never,
    QuerySchema,
    ReqHeaders,
    BaseRequest
  >;
  readonly options?: {
    readonly requestValidation: 'error' | 'warning' | 'none';
    readonly responseValidation: 'error' | 'warning' | 'none';
  };
} & (string | number | symbol extends ExtractedParamsObject<Path>
  ? {
      /** Optional parameters for the contract */
      readonly params?: ParamsSchema;
    }
  : {
      /** Required parameters for the contract */
      readonly params: {
        [K in keyof ExtractedParamsObject<Path>]: ParamsSchema[K];
      };
    });

/**
 * Interface representing HTTP contract details.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template ParamsSchema - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResponseSchemas - A type for response schemas, defaulting to ResponsesObject.
 * @template BodySchema - A type for the body schema, defaulting to Body.
 * @template QuerySchema - A type for query schemas, defaulting to QueryObject.
 */
export type HttpContractDetails<
  SV extends AnySchemaValidator,
  Path extends `/${string}` = `/${string}`,
  ParamsSchema extends ParamsObject<SV> = ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
  BodySchema extends Body<SV> = Body<SV>,
  QuerySchema extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  BaseRequest = unknown
> = PathParamHttpContractDetails<
  SV,
  Path,
  ParamsSchema,
  ResponseSchemas,
  QuerySchema,
  ReqHeaders,
  ResHeaders,
  BaseRequest
> & {
  /** Required body schema for the contract */
  readonly body: BodySchema;
  // TODO: Add support for content type
  /** Optional content type for the contract */
  readonly contentType?:
    | 'application/json'
    | 'multipart/form-data'
    | 'application/x-www-form-urlencoded';
  readonly auth?: SchemaAuthMethods<
    SV,
    string | number | symbol extends ExtractedParamsObject<Path>
      ? {
          [K in keyof ExtractedParamsObject<Path>]: ParamsSchema[K];
        }
      : ParamsSchema,
    BodySchema,
    QuerySchema,
    ReqHeaders,
    BaseRequest
  > & {};
};

/**
 * Interface representing HTTP contract details for middleware.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template ParamsSchema - A type for parameter schemas, defaulting to ParamsObject.
 * @template ResponseSchemas - A type for response schemas, defaulting to ResponsesObject.
 * @template QuerySchema - A type for query schemas, defaulting to QueryObject.
 * @template ReqHeaders - A type for request headers, defaulting to HeadersObject.
 * @template ResHeaders - A type for response headers, defaulting to HeadersObject.
 */
export type MiddlewareContractDetails<
  SV extends AnySchemaValidator,
  Path extends `/${string}` = `/${string}`,
  ParamsSchema extends ParamsObject<SV> = ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
  BodySchema extends Body<SV> = Body<SV>,
  QuerySchema extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  BaseRequest = unknown
> = Omit<
  Partial<
    HttpContractDetails<
      SV,
      Path,
      ParamsSchema,
      ResponseSchemas,
      BodySchema,
      QuerySchema,
      ReqHeaders,
      ResHeaders,
      BaseRequest
    >
  >,
  'name' | 'summary' | 'responses'
>;

/**
 * Utility for different Contract Detail types
 */
export type ContractDetails<
  SV extends AnySchemaValidator,
  ContractMethod extends Method,
  Path extends `/${string}`,
  ParamsSchema extends ParamsObject<SV>,
  ResponseSchemas extends ResponsesObject<SV>,
  BodySchema extends Body<SV>,
  QuerySchema extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  BaseRequest
> = ContractMethod extends PathParamMethod
  ? PathParamHttpContractDetails<
      SV,
      Path,
      ParamsSchema,
      ResponseSchemas,
      QuerySchema,
      ReqHeaders,
      ResHeaders,
      BaseRequest
    >
  : ContractMethod extends HttpMethod
    ? HttpContractDetails<
        SV,
        Path,
        ParamsSchema,
        ResponseSchemas,
        BodySchema,
        QuerySchema,
        ReqHeaders,
        ResHeaders,
        BaseRequest
      >
    : ContractMethod extends 'middleware'
      ? MiddlewareContractDetails<
          SV,
          Path,
          ParamsSchema,
          ResponseSchemas,
          BodySchema,
          QuerySchema,
          ReqHeaders,
          ResHeaders,
          BaseRequest
        >
      : never;
