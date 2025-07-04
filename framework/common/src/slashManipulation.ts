/**
 * Removes a trailing slash from a path string if present.
 *
 * @param path - The path string to process
 * @returns The path string with trailing slash removed
 * @example
 * removeTrailingSlash('/users/'); // '/users'
 * removeTrailingSlash('/users');  // '/users'
 */
export function removeTrailingSlash(path: string): string {
  return path.replace(/\/$/, '');
}

/**
 * Removes a double leading slash from a path string if present.
 *
 * @param path - The path string to process
 * @returns The path string with double leading slash removed
 * @example
 * removeDoubleLeadingSlash('//users'); // '/users'
 * removeDoubleLeadingSlash('/users');  // '/users'
 */
export function removeDoubleLeadingSlash(path: string): string {
  return path.replace(/^\/\//, '/');
}

/**
 * Sanitizes a path string by removing both trailing slashes and double leading slashes.
 *
 * @param path - The path string to process
 * @returns The sanitized path string
 * @example
 * sanitizePathSlashes('//users/'); // '/users'
 * sanitizePathSlashes('/users');   // '/users'
 */
export function sanitizePathSlashes(path: string): string {
  return removeDoubleLeadingSlash(removeTrailingSlash(path));
}
