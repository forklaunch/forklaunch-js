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

/**
 * Type that removes a double leading slash from a string type if present.
 *
 * @template T - The string type to process
 * @example
 * type Route1 = RemoveDoubleLeadingSlash<'//users'>; // '/users'
 * type Route2 = RemoveDoubleLeadingSlash<'/users'>;  // '/users'
 */
export type RemoveDoubleLeadingSlash<T extends string> =
  T extends `//${infer Route}` ? `/${Route}` : T;

/**
 * Type that sanitizes a path string by removing double leading slashes.
 *
 * @template T - The string type to process
 * @example
 * type Route1 = SanitizePathSlashes<'//users'>; // '/users'
 * type Route2 = SanitizePathSlashes<'/users'>;  // '/users'
 */
export type SanitizePathSlashes<T extends string> = RemoveDoubleLeadingSlash<
  RemoveTrailingSlash<T>
>;
