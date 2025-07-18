import {
  Prettify,
  PrettyCamelCase,
  TypeSafeFunction
} from '@forklaunch/common';

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
  const Method extends keyof FetchMap[Path]
>(
  path: Path,
  ...reqInit: FetchMap[Path][Method] extends TypeSafeFunction
    ? 'get' extends keyof FetchMap[Path]
      ? FetchMap[Path]['get'] extends TypeSafeFunction
        ? Parameters<FetchMap[Path]['get']>[1] extends
            | {
                body: unknown;
              }
            | { query: unknown }
            | { params: unknown }
            | { headers: unknown }
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
    : []
) => Promise<
  FetchMap[Path][Method] extends TypeSafeFunction
    ? ReturnType<FetchMap[Path][Method]>
    : never
>;

/**
 * Creates a router SDK by combining the router's SDK with its fetch functionality.
 * This type merges the router's SDK interface with its fetch methods to create
 * a complete router client.
 *
 * @template TRoute - A route object that must contain both `sdk` and `fetch` properties
 * @param TRoute.sdk - The SDK interface/methods for the route
 * @param TRoute.fetch - The fetch functionality for the route
 *
 * @returns A prettified object combining the SDK and fetch properties
 *
 * @example
 * ```typescript
 * type UserRoute = {
 *   sdk: { getUser: () => Promise<User>; createUser: (data: UserData) => Promise<User> };
 *   fetch: { get: (path: string) => Promise<Response> };
 * };
 *
 * type UserRouter = SdkRouter<UserRoute>;
 * // Result: {
 * //   getUser: () => Promise<User>;
 * //   createUser: (data: UserData) => Promise<User>;
 * //   fetch: { get: (path: string) => Promise<Response> };
 * // }
 * ```
 */
export type SdkRouter<TRoute extends { sdk: unknown; fetch: unknown }> =
  Prettify<
    TRoute['sdk'] & {
      fetch: TRoute['fetch'];
    }
  >;

/**
 * Creates a complete SDK client from a record of route definitions.
 * Each route in the input is transformed into an SdkRouter, creating a comprehensive
 * client SDK with all routes and their associated fetch functionality.
 *
 * @template Input - A record where each key represents a route name and each value
 *                   contains the route's SDK, fetch methods, optional SDK name, and base path
 * @param Input[K].sdk - The SDK interface for route K
 * @param Input[K].fetch - The fetch functionality for route K
 * @param Input[K].sdkName - Optional custom name for the SDK (defaults to camelCase basePath)
 * @param Input[K].basePath - The base URL path for the route (used for SDK naming if sdkName not provided)
 *
 * @returns A prettified object where each route becomes an SdkRouter
 *
 * @example
 * ```typescript
 * type Routes = {
 *   users: {
 *     sdk: { getUser: () => Promise<User> };
 *     fetch: { get: (path: string) => Promise<Response> };
 *     basePath: '/api/users';
 *   };
 *   posts: {
 *     sdk: { getPost: () => Promise<Post> };
 *     fetch: { get: (path: string) => Promise<Response> };
 *     basePath: '/api/posts';
 *     sdkName: 'articles';
 *   };
 * };
 *
 * type Client = SdkClient<Routes>;
 * // Result: {
 * //   users: { getUser: () => Promise<User>; fetch: {...} };
 * //   posts: { getPost: () => Promise<Post>; fetch: {...} };
 * // }
 * ```
 */
export type SdkClient<
  Input extends Record<
    string,
    {
      sdk: unknown;
      fetch: unknown;
      sdkName?: string;
      basePath: string;
    }
  >
> = Prettify<{
  [K in keyof Input]: Prettify<SdkRouter<Input[K]>>;
}>;

/**
 * Validates and unpacks SDK client input by ensuring that each key in the input record
 * corresponds to either the route's custom `sdkName` or the PrettyCamelCase version
 * of its `basePath`. This type provides compile-time validation for SDK client configuration.
 *
 * @template Input - A record of route definitions to validate
 * @param Input[K].sdk - The SDK interface for route K
 * @param Input[K].fetch - The fetch functionality for route K
 * @param Input[K].sdkName - Optional custom SDK name that should match the key K
 * @param Input[K].basePath - Base path that when converted to PrettyCamelCase should match key K
 *
 * @returns The original Input type if valid, or 'Invalid SDK Client Input' if validation fails
 *
 * @example
 * ```typescript
 * // Valid input - key matches basePath in camelCase
 * type ValidInput = {
 *   apiUsers: {
 *     sdk: UserSdk;
 *     fetch: FetchMethods;
 *     basePath: '/api/users'; // PrettyCamelCase becomes 'apiUsers'
 *   };
 * };
 * type Result1 = UnpackSdkClientInput<ValidInput>; // Returns ValidInput
 *
 * // Valid input - key matches custom sdkName
 * type ValidInput2 = {
 *   userService: {
 *     sdk: UserSdk;
 *     fetch: FetchMethods;
 *     sdkName: 'userService';
 *     basePath: '/api/users';
 *   };
 * };
 * type Result2 = UnpackSdkClientInput<ValidInput2>; // Returns ValidInput2
 *
 * // Invalid input - key doesn't match either sdkName or camelCase basePath
 * type InvalidInput = {
 *   wrongKey: {
 *     sdk: UserSdk;
 *     fetch: FetchMethods;
 *     basePath: '/api/users'; // Should be 'apiUsers'
 *   };
 * };
 * type Result3 = UnpackSdkClientInput<InvalidInput>; // Returns 'Invalid SDK Client Input'
 * ```
 */
export type UnpackSdkClientInput<
  Input extends Record<
    string,
    {
      sdk: unknown;
      fetch: unknown;
      sdkName?: string;
      basePath: string;
    }
  >
> = Prettify<
  {
    [K in keyof Input]: K extends Input[K]['sdkName']
      ? Input[K]
      : K extends PrettyCamelCase<Input[K]['basePath']>
        ? Input[K]
        : unknown;
  } extends Input
    ? Prettify<Input>
    : 'Invalid SDK Client Input'
>;

/**
 * Type alias for valid SDK client input configuration.
 * This type serves as a constraint to ensure that input to SDK client functions
 * conforms to the expected structure with required sdk, fetch, and basePath properties,
 * plus an optional sdkName property.
 *
 * @template Input - A record of route definitions that must conform to the SDK client structure
 * @param Input[K].sdk - The SDK interface containing route-specific methods
 * @param Input[K].fetch - The fetch functionality for making HTTP requests
 * @param Input[K].sdkName - Optional custom name for the SDK (if not provided, uses camelCase basePath)
 * @param Input[K].basePath - Required base URL path for the route
 *
 * @returns The input type unchanged, serving as a validation constraint
 *
 * @example
 * ```typescript
 * // Use as a constraint in function parameters
 * function createSdkClient<T extends ValidSdkClientInput<T>>(input: T): SdkClient<T> {
 *   // Function implementation
 * }
 *
 * // Valid usage
 * const validInput = {
 *   users: {
 *     sdk: { getUser: () => Promise.resolve({}) },
 *     fetch: { get: (path: string) => fetch(path) },
 *     basePath: '/api/users'
 *   }
 * } satisfies ValidSdkClientInput<UnpackSdkClientInput<typeof validInput>>;
 * ```
 */
export type ValidSdkClientInput<
  Input extends Record<
    string,
    {
      sdk: unknown;
      fetch: unknown;
      sdkName?: string;
      basePath: string;
    }
  >
> = Input;
