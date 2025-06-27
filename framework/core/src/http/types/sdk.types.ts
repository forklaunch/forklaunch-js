import { PrettyCamelCase } from '@forklaunch/common';

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
  [K in keyof Routers as PrettyCamelCase<
    K extends (...args: never[]) => {
      sdkName: string;
      basePath: string;
    }
      ? string extends ReturnType<K>['sdkName']
        ? ReturnType<K>['basePath']
        : ReturnType<K>['sdkName']
      : K extends { sdkName: string; basePath: string }
        ? string extends K['sdkName']
          ? K['basePath']
          : K['sdkName']
        : never
  >]: Routers[K] extends (...args: never[]) => {
    sdk: Record<string, unknown>;
  }
    ? ReturnType<Routers[K]>['sdk']
    : Routers[K] extends { sdk: Record<string, unknown> }
      ? Routers[K]['sdk']
      : never;
};
