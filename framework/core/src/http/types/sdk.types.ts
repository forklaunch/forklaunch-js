import {
  MergeArrayOfMaps,
  Prettify,
  PrettyCamelCase,
  TypeSafeFunction,
  UnionToIntersectionChildren
} from '@forklaunch/common';

/**
 * Extracts all fetchMaps from an array of routers and merges them
 */
export type UnionedFetchMap<Routers extends readonly unknown[]> =
  MergeArrayOfMaps<{
    [K in keyof Routers]: Routers[K] extends { fetchMap: infer FM }
      ? FM extends Record<string, unknown>
        ? FM
        : Record<string, never>
      : Record<string, never>;
  }>;

export type FetchFunction<FetchMap> = <Path extends keyof FetchMap>(
  path: Path,
  ...reqInit: FetchMap[Path] extends TypeSafeFunction
    ? Parameters<FetchMap[Path]>[1] extends
        | {
            body: unknown;
          }
        | { query: unknown }
        | { params: unknown }
        | { headers: unknown }
      ? [reqInit: Parameters<FetchMap[Path]>[1]]
      : [reqInit?: Parameters<FetchMap[Path]>[1]]
    : [reqInit?: never]
) => Promise<
  FetchMap[Path] extends TypeSafeFunction ? ReturnType<FetchMap[Path]> : never
>;

/**
 * Creates a client SDK type from an array of routers.
 *
 * This type maps over router configurations to create a unified SDK client interface.
 * Each router can be either:
 * - A direct object with `sdkName` and `sdk` properties
 * - A function that returns an object with `sdkName` and `sdk` properties
 *
 * @template Routers - Array of router configurations or router factory functions
 * @template {string} Routers[K]['sdkName'] - The name of the SDK for each router
 * @template {Record<string, unknown>} Routers[K]['sdk'] - The SDK methods/endpoints for each router
 *
 * @example
 * ```typescript
 * const routers = [
 *   { sdkName: 'user', sdk: { create: () => {}, get: () => {} } },
 *   () => ({ sdkName: 'auth', sdk: { login: () => {}, logout: () => {} } })
 * ];
 *
 * type Client = SdkClient<typeof routers>;
 * // Result: { user: { create: () => {}, get: () => {} }, auth: { login: () => {}, logout: () => {} } }
 * ```
 */
export type SdkClient<
  Routers extends (
    | { basePath: string; sdkName?: string; sdk: Record<string, unknown> }
    | ((...args: never[]) => {
        basePath: string;
        sdkName?: string;
        sdk: Record<string, unknown>;
      })
  )[]
> = {
  fetch: UnionedFetchMap<Routers> extends infer MergedFetchMap
    ? FetchFunction<MergedFetchMap>
    : never;
  sdk: UnionToIntersectionChildren<{
    [K in Routers[number] as PrettyCamelCase<
      K extends (...args: never[]) => {
        sdkName?: infer SdkName;
        basePath: infer BasePath;
      }
        ? string extends SdkName
          ? BasePath
          : SdkName
        : K extends { sdkName?: infer SdkName; basePath: infer BasePath }
          ? string extends SdkName
            ? BasePath
            : SdkName
          : never
    >]: K extends (...args: never[]) => {
      sdk: infer Sdk;
    }
      ? Prettify<Sdk>
      : K extends { sdk: infer Sdk }
        ? Prettify<Sdk>
        : never;
  }>;
};
