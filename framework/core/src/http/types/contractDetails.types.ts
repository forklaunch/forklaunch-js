import {
  ExclusiveRecord,
  Prettify,
  UnionToIntersection
} from '@forklaunch/common';
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
export type BodyObject<SV extends AnySchemaValidator> = StringOnlyObject<SV>;

/**
 * Type representing the parameters object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type ParamsObject<SV extends AnySchemaValidator> = StringOnlyObject<SV>;

/**
 * Type representing the query object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type QueryObject<SV extends AnySchemaValidator> = StringOnlyObject<SV>;

/**
 * Type representing the headers object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type HeadersObject<SV extends AnySchemaValidator> = StringOnlyObject<SV>;

export type RawTypedResponseBody<SV extends AnySchemaValidator> =
  | TextBody<SV>
  | JsonBody<SV>
  | FileBody<SV>
  | ServerSentEventBody<SV>
  | UnknownResponseBody<SV>;

type ExclusiveResponseBodyBase<SV extends AnySchemaValidator> = {
  [K in keyof UnionToIntersection<RawTypedResponseBody<SV>>]?: undefined;
};

type ExclusiveSchemaCatchall<SV extends AnySchemaValidator> = {
  [K in keyof SV['_SchemaCatchall'] as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]?: undefined;
};

export type TypedResponseBody<SV extends AnySchemaValidator> =
  | {
      [K in keyof (ExclusiveSchemaCatchall<SV> &
        ExclusiveResponseBodyBase<SV>)]?: K extends keyof TextBody<SV>
        ? TextBody<SV>[K]
        : undefined;
    }
  | {
      [K in keyof (ExclusiveSchemaCatchall<SV> &
        ExclusiveResponseBodyBase<SV>)]?: K extends keyof JsonBody<SV>
        ? JsonBody<SV>[K]
        : undefined;
    }
  | {
      [K in keyof (ExclusiveSchemaCatchall<SV> &
        ExclusiveResponseBodyBase<SV>)]?: K extends keyof FileBody<SV>
        ? FileBody<SV>[K]
        : undefined;
    }
  | {
      [K in keyof (ExclusiveSchemaCatchall<SV> &
        ExclusiveResponseBodyBase<SV>)]?: K extends keyof ServerSentEventBody<SV>
        ? ServerSentEventBody<SV>[K]
        : undefined;
    }
  | {
      [K in keyof (ExclusiveSchemaCatchall<SV> &
        ExclusiveResponseBodyBase<SV>)]?: K extends keyof UnknownResponseBody<SV>
        ? UnknownResponseBody<SV>[K]
        : undefined;
    };

export type ResponseBody<SV extends AnySchemaValidator> =
  | TypedResponseBody<SV>
  | (ExclusiveResponseBodyBase<SV> & SV['_ValidSchemaObject'])
  | (ExclusiveResponseBodyBase<SV> & UnboxedObjectSchema<SV>)
  | (ExclusiveResponseBodyBase<SV> & SV['string'])
  | (ExclusiveResponseBodyBase<SV> & SV['number'])
  | (ExclusiveResponseBodyBase<SV> & SV['boolean'])
  | (ExclusiveResponseBodyBase<SV> & SV['array'])
  | (ExclusiveResponseBodyBase<SV> & SV['file']);

/**
 * Type representing the responses object in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type ResponsesObject<SV extends AnySchemaValidator> = {
  [K: number]: ResponseBody<SV>;
};

export type JsonBody<SV extends AnySchemaValidator> = {
  contentType?: 'application/json' | string;
  json: BodyObject<SV> | SV['_ValidSchemaObject'] | SV['_SchemaCatchall'];
};

/**
 * Type representing the body in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type TextBody<SV extends AnySchemaValidator> = {
  contentType?:
    | 'application/xml'
    | 'text/plain'
    | 'text/html'
    | 'text/css'
    | 'text/javascript'
    | 'text/csv'
    | 'text/markdown'
    | 'text/xml'
    | 'text/rtf'
    | 'text/x-yaml'
    | 'text/yaml'
    | string;
  text: SV['string'];
};

export type FileBody<SV extends AnySchemaValidator> = {
  contentType?:
    | 'application/octet-stream'
    | 'application/pdf'
    | 'application/vnd.ms-excel'
    | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    | 'application/msword'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'application/zip'
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'audio/mpeg'
    | 'audio/wav'
    | 'video/mp4'
    | string;
  file: SV['file'];
};

/**
 * Type representing the body in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type MultipartForm<SV extends AnySchemaValidator> = {
  contentType?:
    | 'multipart/form-data'
    | 'multipart/mixed'
    | 'multipart/alternative'
    | 'multipart/related'
    | 'multipart/signed'
    | 'multipart/encrypted'
    | string;
  multipartForm: BodyObject<SV>;
};

/**
 * Type representing the body in a request.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export type UrlEncodedForm<SV extends AnySchemaValidator> = {
  contentType?:
    | 'application/x-www-form-urlencoded'
    | 'application/x-url-encoded'
    | 'application/x-www-url-encoded'
    | 'application/x-urlencode'
    | string;
  urlEncodedForm: BodyObject<SV>;
};

export type ServerSentEventBody<SV extends AnySchemaValidator> = {
  contentType?: 'text/event-stream' | string;
  event: {
    id: SV['string'];
    data: SV['string'] | BodyObject<SV>;
  };
};

export type UnknownBody<SV extends AnySchemaValidator> = {
  contentType?: string;
  schema: BodyObject<SV> | SV['_ValidSchemaObject'] | SV['_SchemaCatchall'];
};

export type UnknownResponseBody<SV extends AnySchemaValidator> = {
  contentType?: string;
  schema: BodyObject<SV> | SV['_ValidSchemaObject'] | SV['_SchemaCatchall'];
};

export type TypedBody<SV extends AnySchemaValidator> =
  | JsonBody<SV>
  | TextBody<SV>
  | FileBody<SV>
  | MultipartForm<SV>
  | UrlEncodedForm<SV>
  | UnknownBody<SV>;

export type Body<SV extends AnySchemaValidator> =
  | TypedBody<SV>
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
> &
  (BodySchema extends SV['_SchemaCatchall']
    ? {
        /** Required body schema for body-based methods for the contract */
        readonly body: BodySchema;
      }
    : BodySchema extends JsonBody<SV>
      ? {
          /** Required body schema for body-based methods for the contract */
          readonly body: ExclusiveRecord<BodySchema, TypedBody<SV>>;
        }
      : BodySchema extends TextBody<SV>
        ? {
            /** Required body schema for body-based methods for the contract */
            readonly body: ExclusiveRecord<BodySchema, TypedBody<SV>>;
          }
        : BodySchema extends MultipartForm<SV>
          ? {
              /** Required body schema for body-based methods for the contract */
              readonly body: ExclusiveRecord<BodySchema, TypedBody<SV>>;
            }
          : BodySchema extends UrlEncodedForm<SV>
            ? {
                /** Required body schema for body-based methods for the contract */
                readonly body: ExclusiveRecord<BodySchema, TypedBody<SV>>;
              }
            : BodySchema extends FileBody<SV>
              ? {
                  /** Required body schema for body-based methods for the contract */
                  readonly body: ExclusiveRecord<BodySchema, TypedBody<SV>>;
                }
              : {
                  /** Required body schema for body-based methods for the contract */
                  readonly body: BodySchema;
                }) & {
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
    >;
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
