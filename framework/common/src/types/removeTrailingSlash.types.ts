/**
 * Type that removes a trailing slash from a string type if present.
 *
 * @template T - The string type to process
 * @example
 * type Route1 = RemoveTrailingSlash<'/users/'>; // '/users'
 * type Route2 = RemoveTrailingSlash<'/users'>;  // '/users'
 */
export type RemoveTrailingSlash<T extends string> = T extends `${infer Route}/`
  ? Route
  : T;
