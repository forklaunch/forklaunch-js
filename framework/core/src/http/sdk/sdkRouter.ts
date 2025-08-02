import { toPrettyCamelCase } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import {
  FetchFunction,
  MapControllerToSdk,
  SdkHandler,
  ToFetchMap
} from '../types/sdk.types';

/**
 * Creates a type-safe SDK router by mapping controller definitions to router SDK functions.
 * This function takes a controller object with contract details and maps each controller method
 * to the corresponding SDK function from the router, ensuring type safety throughout the process.
 * The function now uses `const` template parameters for better type inference and includes
 * a comprehensive fetch map for enhanced type safety.
 *
 * @template SV - The schema validator type that constrains the router and controller structure
 * @template T - The controller type containing contract details for each endpoint (const parameter)
 * @template Router - The router type that provides SDK functions, fetch, and _fetchMap capabilities (const parameter)
 * @param SV - Must extend AnySchemaValidator to ensure type safety
 * @param T - Must be a const record where each key maps to a controller method with contract details
 * @param Router - Must be a const object with optional sdk, fetch, and _fetchMap properties
 *
 * @param schemaValidator - The schema validator instance used for validation and type constraints
 * @param controller - The controller object containing contract details for each endpoint
 * @param router - The router instance that provides SDK functions, fetch, and _fetchMap capabilities
 *
 * @returns An object containing:
 *          - `sdk`: Type-safe SDK functions mapped from controller methods using LiveSdkFunction
 *          - `fetch`: The router's fetch function cast to FetchFunction with proper typing
 *          - `_fetchMap`: A comprehensive fetch map with LiveTypeFunction for each endpoint and method
 *
 * @example
 * ```typescript
 * const controller = {
 *   createAgent: {
 *     _path: '/agents',
 *     _method: 'POST',
 *     contractDetails: {
 *       name: 'createAgent',
 *       body: { name: 'string', organizationId: 'string' },
 *       responses: { 200: { id: 'string', name: 'string' } }
 *     }
 *   },
 *   getAgent: {
 *     _path: '/agents/:id',
 *     _method: 'GET',
 *     contractDetails: {
 *       name: 'getAgent',
 *       params: { id: 'string' },
 *       responses: { 200: { id: 'string', name: 'string' } }
 *     }
 *   }
 * } as const;
 *
 * const router = {
 *   sdk: { createAgent: () => Promise.resolve({}), getAgent: () => Promise.resolve({}) },
 *   fetch: (path: string, options: any) => fetch(path, options),
 *   _fetchMap: { '/agents': { POST: () => fetch('/agents', { method: 'POST' }) } }
 * } as const;
 *
 * const sdkRouter = sdkRouter(zodValidator, controller, router);
 *
 * // Use SDK functions with full type safety
 * const agent = await sdkRouter.sdk.createAgent({
 *   body: { name: 'My Agent', organizationId: 'org123' }
 * });
 *
 * const agentData = await sdkRouter.sdk.getAgent({
 *   params: { id: 'agent123' }
 * });
 *
 * // Use fetch function with enhanced type safety
 * const response = await sdkRouter.fetch('/agents', {
 *   method: 'POST',
 *   body: { name: 'Custom Agent', organizationId: 'org456' }
 * });
 *
 * // Access the fetch map for advanced usage
 * const _fetchMap = sdkRouter._fetchMap;
 * ```
 */
export function sdkRouter<
  SV extends AnySchemaValidator,
  const T extends Record<string, SdkHandler>,
  const Router extends {
    sdk?: unknown;
    fetch?: unknown;
    _fetchMap?: unknown;
    basePath?: string;
    sdkPaths: Record<string, string>;
  }
>(schemaValidator: SV, controller: T, router: Router) {
  const controllerSdkPaths: string[] = [];
  const mappedSdk = Object.fromEntries(
    Object.entries(controller).map(([key, value]) => {
      const sdkPath = [value._method, value._path].join('.');
      controllerSdkPaths.push(sdkPath);
      router.sdkPaths[sdkPath] = key;
      return [
        key,
        (router.sdk as Record<string, unknown>)[
          toPrettyCamelCase(value.contractDetails.name)
        ]
      ];
    })
  );

  const _fetchMap = router._fetchMap as ToFetchMap<
    T,
    SV,
    Router['basePath'] extends `/${string}` ? Router['basePath'] : '/'
  >;

  return {
    sdk: mappedSdk as MapControllerToSdk<SV, T>,
    fetch: router.fetch as FetchFunction<typeof _fetchMap>,
    _fetchMap,
    sdkPaths: router.sdkPaths,
    controllerSdkPaths
  } as {
    sdk: MapControllerToSdk<SV, T>;
    fetch: FetchFunction<typeof _fetchMap>;
    _fetchMap: typeof _fetchMap;
    sdkPaths: Router['sdkPaths'];
  };
}
