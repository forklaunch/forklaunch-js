import {
  Prettify,
  TypeSafeFunction,
  UnionToIntersection
} from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { LiveSdkFunction, LiveTypeFunction } from './apiDefinition.types';
import {
  AuthMethodsBase,
  Body,
  HeadersObject,
  Method,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  VersionSchema
} from './contractDetails.types';

/**
 * Creates a type-safe fetch function based on a provided fetch map.
 * This type generates a function that provides compile-time type safety for HTTP requests,
 * ensuring that the correct path and request parameters are used for each endpoint.
 *
 * @template FetchMap - A record mapping paths to their corresponding TypeSafeFunction signatures
 * @param FetchMap[Path] - Each path should map to a TypeSafeFunction that defines the request/response contract
 *
 * @returns A generic function that:
 * - Takes a path parameter constrained to keys of FetchMap
 * - Takes optional request initialization parameters based on the function signature
 * - Returns a Promise of the expected response type
 *
 * @remarks
 * The function parameters are conditionally typed:
 * - If the mapped function expects body, query, params, or headers, reqInit is required
 * - Otherwise, reqInit is optional
 * - If the path doesn't map to a TypeSafeFunction, reqInit is never
 *
 * @example
 * ```typescript
 * // Define your API endpoints
 * type UserAPI = {
 *   '/users': (baseUrl: string, options?: { query?: { limit?: number } }) => Promise<User[]>;
 *   '/users/:id': (baseUrl: string, options: { params: { id: string } }) => Promise<User>;
 *   '/users/create': (baseUrl: string, options: { body: CreateUserRequest }) => Promise<User>;
 * };
 *
 * // Create a type-safe fetch function
 * type UserFetch = FetchFunction<UserAPI>;
 *
 * // Usage examples
 * const userFetch: UserFetch = async (path, reqInit) => {
 *   // Implementation details...
 * };
 *
 * // Type-safe calls
 * const users = await userFetch('/users'); // reqInit is optional
 * const user = await userFetch('/users/:id', { params: { id: '123' } }); // reqInit required
 * const newUser = await userFetch('/users/create', { body: { name: 'John' } }); // reqInit required
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage with multiple parameter types
 * type ComplexAPI = {
 *   '/search': (baseUrl: string, options: {
 *     query: { q: string; limit?: number };
 *     headers: { 'X-API-Key': string };
 *   }) => Promise<SearchResult[]>;
 * };
 *
 * type ComplexFetch = FetchFunction<ComplexAPI>;
 * const complexFetch: ComplexFetch = async (path, reqInit) => { ... };
 *
 * // Both query and headers are required
 * const results = await complexFetch('/search', {
 *   query: { q: 'typescript' },
 *   headers: { 'X-API-Key': 'secret' }
 * });
 * ```
 **/
export type FetchFunction<FetchMap> = <
  const Path extends keyof FetchMap,
  const Method extends keyof FetchMap[Path],
  const Version extends keyof FetchMap[Path][Method]
>(
  path: Path,
  ...reqInit: FetchMap[Path][Method] extends TypeSafeFunction
    ? 'GET' extends keyof FetchMap[Path]
      ? FetchMap[Path]['GET'] extends TypeSafeFunction
        ? Parameters<FetchMap[Path]['GET']>[1] extends
            | { body: unknown }
            | { query: unknown }
            | { params: unknown }
            | { headers: unknown }
            | { version: unknown }
          ? [
              reqInit: Omit<Parameters<FetchMap[Path][Method]>[1], 'method'> & {
                method: Method;
              }
            ]
          : [
              reqInit?: Omit<
                Parameters<FetchMap[Path][Method]>[1],
                'method'
              > & {
                method: Method;
              }
            ]
        : [
            reqInit: Omit<Parameters<FetchMap[Path][Method]>[1], 'method'> & {
              method: Method;
            }
          ]
      : [
          reqInit: Omit<Parameters<FetchMap[Path][Method]>[1], 'method'> & {
            method: Method;
          }
        ]
    : FetchMap[Path][Method] extends Record<string, TypeSafeFunction>
      ? [
          reqInit: Omit<
            Parameters<FetchMap[Path][Method][Version]>[0],
            'method' | 'version'
          > & {
            method: Method;
            version: Version;
          }
        ]
      : [{ method: Method }]
) => Promise<
  FetchMap[Path][Method] extends TypeSafeFunction
    ? Awaited<ReturnType<FetchMap[Path][Method]>>
    : FetchMap[Path][Method] extends Record<string, TypeSafeFunction>
      ? Awaited<ReturnType<FetchMap[Path][Method][Version]>>
      : never
>;

/**
 * Represents the structure of a SDK router.
 *
 * @property sdk - The SDK object containing all the SDK functions.
 * @property _fetchMap - The fetch map object containing all the fetch functions.
 * @property sdkPaths - The SDK paths object containing all the SDK paths.
 */
export type SdkRouter = {
  sdk: Record<string, unknown>;
  _fetchMap: Record<string, unknown>;
  sdkPaths: Record<string, string>;
};

/**
 * Recursive interface representing a hierarchical map of router configurations.
 * Each entry can either be a leaf node with SDK and fetch map configurations,
 * or a nested RouterMap for deeper routing structures.
 *
 * @template SV - The schema validator type that constrains the router structure
 * @param SV - Must extend AnySchemaValidator to ensure type safety
 *
 * @example
 * ```typescript
 * const routerMap: RouterMap<ZodValidator> = {
 *   api: {
 *     users: {
 *       sdk: { getUser: () => Promise.resolve({}) },
 *       _fetchMap: { getUser: { get: () => fetch('/api/users') } }
 *     },
 *     posts: {
 *       sdk: { getPosts: () => Promise.resolve([]) },
 *       _fetchMap: { getPosts: { get: () => fetch('/api/posts') } }
 *     }
 *   }
 * };
 * ```
 */
export type RouterMap<SV extends AnySchemaValidator> = {
  [K: string]: SdkRouter | RouterMap<SV>;
};

/**
 * Tail-recursive type that extracts SDK interfaces from a RouterMap structure.
 * This version uses an accumulator pattern to avoid deep recursion and improve performance.
 * Traverses the nested router map and collects all SDK interfaces into a flat structure.
 *
 * @template SV - The schema validator type
 * @template T - The RouterMap to extract SDKs from
 * @template Acc - The accumulator type for collecting SDK interfaces (defaults to empty object)
 * @param SV - Must extend AnySchemaValidator
 * @param T - Must extend RouterMap<SV>
 * @param Acc - The accumulated SDK interfaces so far
 *
 * @returns A mapped type where each key corresponds to the original router structure,
 *         but values are the extracted SDK interfaces instead of the full router configuration
 *
 * @example
 * ```typescript
 * // Given a RouterMap with nested structure
 * type ExtractedSdk = MapToSdk<ZodValidator, typeof routerMap>;
 * // Results in: { api: { users: { getUser: () => Promise<{}> }, posts: { getPosts: () => Promise<[]> } } }
 * ```
 */
export type MapToSdk<
  SV extends AnySchemaValidator,
  T extends RouterMap<SV>,
  Acc extends Record<string, unknown> = Record<string, never>
> = {
  [K in keyof T]: T[K] extends { sdk: infer S }
    ? S
    : T[K] extends RouterMap<SV>
      ? MapToSdk<SV, T[K], Acc>
      : never;
};

/**
 * Tail-recursive type that extracts and flattens fetch map interfaces from a RouterMap structure.
 * This version uses an accumulator pattern to avoid deep recursion and improve performance.
 * Similar to MapToSdk but focuses on _fetchMap properties and merges all fetch maps into a single intersection type.
 *
 * @template SV - The schema validator type
 * @template T - The RouterMap to extract fetch maps from
 * @template Acc - The accumulator type for collecting fetch maps (defaults to empty object)
 * @param SV - Must extend AnySchemaValidator
 * @param T - Must extend RouterMap<SV>
 * @param Acc - The accumulated fetch maps so far
 *
 * @returns An intersection type containing all fetch map interfaces from the router structure,
 *         flattened into a single type for unified fetch functionality
 *
 * @example
 * ```typescript
 * // Given a RouterMap with nested fetch maps
 * type ExtractedFetch = MapToFetch<ZodValidator, typeof routerMap>;
 * // Results in: { getUser: { get: () => Promise<Response> } } & { getPosts: { get: () => Promise<Response> } }
 * ```
 */
export type MapToFetch<
  SV extends AnySchemaValidator,
  T extends RouterMap<SV>
> = UnionToIntersection<
  Prettify<
    {
      [K in keyof T]: T[K] extends RouterMap<SV>
        ? MapToFetch<SV, T[K]>
        : T[K] extends { _fetchMap: infer F }
          ? F extends Record<string, unknown>
            ? F
            : never
          : never;
    }[keyof T]
  >
>;

/**
 * Base interface for controller entries that defines the structure
 * of each controller method with its path, HTTP method, and contract details.
 * This type serves as the foundation for type-safe SDK generation by ensuring
 * all controller entries follow a consistent structure.
 *
 * @template SV - The schema validator type that constrains the contract details
 *
 * @example
 * ```typescript
 * const controller: Record<string, SdkHandler> = {
 *   createUser: {
 *     _path: '/users',
 *     _method: 'post',
 *     contractDetails: {
 *       name: 'createUser',
 *       body: { name: string, email: string },
 *       responses: { 201: { id: string, name: string } }
 *     }
 *   },
 *   getUser: {
 *     _path: '/users/:id',
 *     _method: 'get',
 *     contractDetails: {
 *       name: 'getUser',
 *       params: { id: string },
 *       responses: { 200: { id: string, name: string } }
 *     }
 *   }
 * };
 * ```
 */
export type SdkHandler = {
  /** The HTTP path for this endpoint, must start with '/' */
  _path?: `/${string}`;
  /** The HTTP method for this endpoint (get, post, put, etc.) */
  _method?: Method;
  /** Contract details defining the request/response schema for this endpoint */
  contractDetails: {
    /** The name of this endpoint/method */
    name: string;
    /** URL parameters schema */
    params?: unknown;
    /** Response schemas for different status codes */
    responses?: unknown;
    /** Query parameters schema */
    query?: unknown;
    /** Request body schema */
    body?: unknown;
    /** Request headers schema */
    requestHeaders?: unknown;
    /** Response headers schema */
    responseHeaders?: unknown;
    /** Authentication requirements */
    auth?: unknown;
    /** API versioning information */
    versions?: unknown;
  };
};

export type MapControllerToSdk<
  SV extends AnySchemaValidator,
  T extends Record<string, SdkHandler>
> = {
  [K in keyof T]: LiveSdkFunction<
    SV,
    T[K]['contractDetails']['params'] extends infer Params | undefined
      ? Params extends ParamsObject<SV>
        ? Params
        : ParamsObject<SV>
      : ParamsObject<SV>,
    T[K]['contractDetails']['responses'] extends infer Responses | undefined
      ? Responses extends ResponsesObject<SV>
        ? Responses
        : ResponsesObject<SV>
      : ResponsesObject<SV>,
    T[K]['contractDetails']['body'] extends infer B | undefined
      ? B extends Body<SV>
        ? B
        : Body<SV>
      : Body<SV>,
    T[K]['contractDetails']['query'] extends infer Q | undefined
      ? Q extends QueryObject<SV>
        ? Q
        : QueryObject<SV>
      : QueryObject<SV>,
    T[K]['contractDetails']['requestHeaders'] extends
      | infer RequestHeaders
      | undefined
      ? RequestHeaders extends HeadersObject<SV>
        ? RequestHeaders
        : HeadersObject<SV>
      : HeadersObject<SV>,
    T[K]['contractDetails']['responseHeaders'] extends
      | infer ResponseHeaders
      | undefined
      ? ResponseHeaders extends HeadersObject<SV>
        ? ResponseHeaders
        : HeadersObject<SV>
      : HeadersObject<SV>,
    T[K]['contractDetails']['versions'] extends infer Versions | undefined
      ? Versions extends VersionSchema<SV, Method>
        ? Versions
        : VersionSchema<SV, Method>
      : VersionSchema<SV, Method>,
    T[K]['contractDetails']['auth'] extends infer Auth | undefined
      ? Auth extends AuthMethodsBase
        ? Auth
        : AuthMethodsBase
      : AuthMethodsBase
  >;
};

/**
 * Extracts and constructs a LiveTypeFunction from an SdkHandler object.
 * This type utility takes a controller entry and transforms it into a type-safe
 * function that can be used for making HTTP requests with full type safety.
 *
 * @template Entry - The controller entry containing path, method, and contract details
 * @template SV - The schema validator type that constrains the contract details
 * @template BasePath - The base path prefix to prepend to the entry's path
 *
 * @returns A LiveTypeFunction with properly typed parameters and return values
 *          based on the entry's contract details
 *
 * @example
 * ```typescript
 * type UserCreateFunction = ExtractLiveTypeFn<
 *   { _path: '/users', _method: 'post', contractDetails: { body: { name: string } } },
 *   SchemaValidator,
 *   '/api/v1'
 * >;
 * // Results in: (path: '/api/v1/users', options: { body: { name: string } }) => Promise<...>
 * ```
 */
export type ExtractLiveTypeFn<
  Entry extends SdkHandler,
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`
> = LiveTypeFunction<
  SV,
  Entry['_path'] extends infer Path | undefined
    ? Path extends `/${string}`
      ? `${BasePath}${Path}`
      : never
    : never,
  Entry['contractDetails']['params'] extends infer Params | undefined
    ? Params extends ParamsObject<SV>
      ? Params
      : ParamsObject<SV>
    : ParamsObject<SV>,
  Entry['contractDetails']['responses'] extends infer Responses | undefined
    ? Responses extends ResponsesObject<SV>
      ? Responses
      : ResponsesObject<SV>
    : ResponsesObject<SV>,
  Entry['contractDetails']['body'] extends infer B | undefined
    ? B extends Body<SV>
      ? B
      : Body<SV>
    : Body<SV>,
  Entry['contractDetails']['query'] extends infer Q | undefined
    ? Q extends QueryObject<SV>
      ? Q
      : QueryObject<SV>
    : QueryObject<SV>,
  Entry['contractDetails']['requestHeaders'] extends
    | infer RequestHeaders
    | undefined
    ? RequestHeaders extends HeadersObject<SV>
      ? RequestHeaders
      : HeadersObject<SV>
    : HeadersObject<SV>,
  Entry['contractDetails']['responseHeaders'] extends
    | infer ResponseHeaders
    | undefined
    ? ResponseHeaders extends HeadersObject<SV>
      ? ResponseHeaders
      : HeadersObject<SV>
    : HeadersObject<SV>,
  Entry['_method'] extends Method ? Entry['_method'] : never,
  Entry['contractDetails']['versions'] extends infer Versions | undefined
    ? Versions extends VersionSchema<SV, Method>
      ? Versions
      : VersionSchema<SV, Method>
    : VersionSchema<SV, Method>,
  Entry['contractDetails']['auth'] extends infer Auth | undefined
    ? Auth extends AuthMethodsBase
      ? Auth
      : AuthMethodsBase
    : AuthMethodsBase
>;

/**
 * Transforms a controller object into a fetch map structure that provides
 * type-safe access to HTTP endpoints. This type creates a discriminated union
 * where each path maps to its specific HTTP methods, ensuring that different
 * methods for the same path are properly discriminated rather than unioned.
 *
 * @template T - The controller object type containing all endpoint definitions
 * @template SV - The schema validator type that constrains the contract details
 * @template RouterBasePath - The base path prefix for the router
 *
 * @returns A fetch map structure where:
 *          - Keys are full paths (basePath + entry path)
 *          - Values are records mapping HTTP methods to their corresponding LiveTypeFunctions
 *          - Each method is properly discriminated with its own contract details
 *
 * @example
 * ```typescript
 * const controller = {
 *   createUser: { _path: '/users', _method: 'post', contractDetails: { body: { name: string } } },
 *   getUser: { _path: '/users/:id', _method: 'get', contractDetails: { params: { id: string } } },
 *   updateUser: { _path: '/users/:id', _method: 'put', contractDetails: { body: { name: string } } }
 * } as const;
 *
 * type FetchMap = ToFetchMap<typeof controller, SchemaValidator, '/api/v1'>;
 * // Results in:
 * // {
 * //   '/api/v1/users': {
 * //     POST: LiveTypeFunction<...>, // from createUser
 * //   },
 * //   '/api/v1/users/:id': {
 * //     GET: LiveTypeFunction<...>,  // from getUser
 * //     PUT: LiveTypeFunction<...>   // from updateUser
 * //   }
 * // }
 * ```
 */
export type ToFetchMap<
  T extends Record<string, SdkHandler>,
  SV extends AnySchemaValidator,
  RouterBasePath extends `/${string}`
> = {
  [K in keyof T as T[K]['_path'] extends infer P | undefined
    ? P extends `/${string}`
      ? `${RouterBasePath}${P}`
      : never
    : never]: {
    [M in T[K]['_method'] as M extends Method
      ? Uppercase<M>
      : never]: ExtractLiveTypeFn<
      Extract<
        T[K],
        {
          _path: T[K]['_path'];
          _method: M;
        }
      >,
      SV,
      RouterBasePath
    >;
  };
};
