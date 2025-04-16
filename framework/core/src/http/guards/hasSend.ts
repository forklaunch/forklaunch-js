/**
 * Type guard that checks if an object has a `send` method.
 *
 * @param res - The object to check for the presence of a `send` method
 * @returns A type predicate indicating whether the object has a `send` method
 *
 * @example
 * ```ts
 * if (hasSend(response)) {
 *   response.send('Hello World');
 * }
 * ```
 */
export function hasSend(
  res: unknown
): res is { send: (body: unknown) => void } {
  return typeof res === 'object' && res !== null && 'send' in res;
}
