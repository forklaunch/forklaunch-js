import { AnySchemaValidator } from '@forklaunch/validator';
import { isSdkRouter } from '../guards/isSdkRouter';
import {
  FetchFunction,
  MapToFetch,
  MapToSdk,
  RouterMap
} from '../types/sdk.types';

/**
 * Recursively extracts SDK interfaces from a RouterMap structure.
 * This function traverses the nested router configuration and builds a flat SDK
 * object that contains all the SDK methods from the router hierarchy.
 *
 * @template SV - The schema validator type that constrains the router structure
 * @template T - The RouterMap type to extract SDKs from
 * @param schemaValidator - The schema validator instance (used for type constraints)
 * @param routerMap - The router map containing nested SDK configurations
 *
 * @returns A flat SDK object where each key corresponds to the original router structure,
 *         but values are the extracted SDK interfaces instead of full router configurations
 *
 * @example
 * ```typescript
 * const routerMap = {
 *   api: {
 *     users: {
 *       sdk: { getUser: () => Promise.resolve({ id: 1, name: 'John' }) },
 *       fetchMap: { getUser: { get: () => fetch('/api/users') } }
 *     },
 *     posts: {
 *       sdk: { getPosts: () => Promise.resolve([]) },
 *       fetchMap: { getPosts: { get: () => fetch('/api/posts') } }
 *     }
 *   }
 * };
 *
 * const sdk = mapToSdk(zodValidator, routerMap);
 * // Results in: { api: { users: { getUser: () => Promise<...> }, posts: { getPosts: () => Promise<...> } } }
 * ```
 */
function mapToSdk<SV extends AnySchemaValidator, T extends RouterMap<SV>>(
  schemaValidator: SV,
  routerMap: T,
  runningPath: string = ''
): MapToSdk<SV, T> {
  return Object.fromEntries(
    Object.entries(routerMap).map(([key, value]) => {
      if (isSdkRouter(value)) {
        Object.entries(value.sdkPaths).forEach(([path, key]) => {
          value.sdkPaths[path] = [runningPath, key].join('.');
        });
        return [key, value.sdk];
      } else {
        return [
          key,
          mapToSdk(schemaValidator, value, [runningPath, key].join('.'))
        ];
      }
    })
  ) as MapToSdk<SV, T>;
}

/**
 * Recursively flattens fetch map interfaces from a RouterMap structure.
 * This function traverses the nested router configuration and merges all fetch maps
 * into a single flat structure, handling conflicts by merging overlapping keys.
 *
 * @template SV - The schema validator type that constrains the router structure
 * @template T - The RouterMap type to extract fetch maps from
 * @param schemaValidator - The schema validator instance (used for type constraints)
 * @param routerMap - The router map containing nested fetch map configurations
 *
 * @returns A flattened fetch map where all nested fetch configurations are merged
 *         into a single level, with conflicts resolved by merging overlapping keys
 *
 * @example
 * ```typescript
 * const routerMap = {
 *   api: {
 *     users: {
 *       sdk: { getUser: () => Promise.resolve({}) },
 *       fetchMap: { getUser: { get: () => fetch('/api/users') } }
 *     },
 *     posts: {
 *       sdk: { getPosts: () => Promise.resolve([]) },
 *       fetchMap: { getPosts: { get: () => fetch('/api/posts') } }
 *     }
 *   }
 * };
 *
 * const fetchMap = flattenFetchMap(zodValidator, routerMap);
 * // Results in: { getUser: { get: () => fetch('/api/users') }, getPosts: { get: () => fetch('/api/posts') } }
 * ```
 */
function flattenFetchMap<
  SV extends AnySchemaValidator,
  T extends RouterMap<SV>
>(schemaValidator: SV, routerMap: T): MapToFetch<SV, T> {
  const fetchMap = Object.entries(routerMap).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if ('fetchMap' in value) {
        if (acc[key]) {
          return {
            ...acc,
            [key]: { ...acc[key], ...value.fetchMap }
          };
        } else {
          return { ...acc, [key]: value.fetchMap };
        }
      } else {
        return {
          ...acc,
          ...(flattenFetchMap(schemaValidator, value) as Record<
            string,
            unknown
          >)
        };
      }
    },
    {}
  );
  return fetchMap as MapToFetch<SV, T>;
}

/**
 * Creates a type-safe fetch function from a RouterMap structure.
 * This function uses the flattened fetch map to create a unified fetch interface
 * that can handle all the routes defined in the router map.
 *
 * @template SV - The schema validator type that constrains the router structure
 * @template T - The RouterMap type to create the fetch function from
 * @param schemaValidator - The schema validator instance (used for type constraints)
 * @param routerMap - The router map containing the route configurations
 *
 * @returns A FetchFunction that can handle all routes defined in the router map,
 *         with proper TypeScript typing for parameters and return types
 *
 * @example
 * ```typescript
 * const routerMap = {
 *   users: {
 *     sdk: { getUser: () => Promise.resolve({}) },
 *     fetchMap: { getUser: { get: (id: string) => fetch(`/api/users/${id}`) } }
 *   }
 * };
 *
 * const fetchFn = mapToFetch(zodValidator, routerMap);
 * // fetchFn('getUser', { params: { id: '123' } }) -> Promise<Response>
 * ```
 */
function mapToFetch<SV extends AnySchemaValidator, T extends RouterMap<SV>>(
  schemaValidator: SV,
  routerMap: T
): FetchFunction<MapToFetch<SV, T>> {
  const flattenedFetchMap = flattenFetchMap(
    schemaValidator,
    routerMap
  ) as Record<string, unknown>;
  return ((path: string, ...reqInit: unknown[]) => {
    return (
      flattenedFetchMap[path] as (
        route: string,
        request?: unknown
      ) => Promise<unknown>
    )(path as string, reqInit[0]);
  }) as FetchFunction<MapToFetch<SV, T>>;
}

/**
 * Creates a complete SDK client from a RouterMap configuration.
 * This is the main entry point for creating type-safe SDK clients that combine
 * both SDK interfaces and fetch functionality from router configurations.
 *
 * @template SV - The schema validator type that constrains the router structure
 * @template T - The RouterMap type to create the SDK client from
 * @param schemaValidator - The schema validator instance used for validation and type constraints
 * @param routerMap - The router map containing the complete API configuration
 *
 * @returns An object containing both the SDK interface and fetch function:
 *          - `sdk`: The extracted SDK interfaces for direct method calls
 *          - `fetch`: The unified fetch function for making HTTP requests
 *
 * @example
 * ```typescript
 * const routerMap = {
 *   api: {
 *     users: {
 *       sdk: { getUser: (id: string) => Promise.resolve({ id, name: 'John' }) },
 *       fetchMap: { getUser: { get: (id: string) => fetch(`/api/users/${id}`) } }
 *     },
 *     posts: {
 *       sdk: { getPosts: () => Promise.resolve([]) },
 *       fetchMap: { getPosts: { get: () => fetch('/api/posts') } }
 *     }
 *   }
 * };
 *
 * const client = sdkClient(zodValidator, routerMap);
 *
 * // Use SDK methods directly
 * const user = await client.sdk.api.users.getUser('123');
 *
 * // Use fetch function for custom requests
 * const response = await client.fetch('getUser', { params: { id: '123' } });
 * ```
 */
export function sdkClient<
  SV extends AnySchemaValidator,
  T extends RouterMap<SV>
>(
  schemaValidator: SV,
  routerMap: T
): {
  _finalizedSdk: true;
  sdk: MapToSdk<SV, T>;
  fetch: FetchFunction<MapToFetch<SV, T>>;
} {
  return {
    _finalizedSdk: true,
    sdk: mapToSdk(schemaValidator, routerMap),
    fetch: mapToFetch(schemaValidator, routerMap)
  };
}
