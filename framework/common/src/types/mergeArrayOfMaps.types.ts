import { MergeUnionOnCollision } from './mergeUnionOnCollision.types';

/**
 * Recursively merges an array of fetchMap objects
 */
export type MergeArrayOfMaps<T extends readonly Record<string, unknown>[]> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends Record<string, unknown>
      ? Rest extends readonly Record<string, unknown>[]
        ? Rest extends readonly []
          ? First
          : MergeUnionOnCollision<First, MergeArrayOfMaps<Rest>>
        : First
      : Record<string, never>
    : Record<string, never>;
