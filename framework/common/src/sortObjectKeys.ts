/**
 * Recursively sorts the keys of an object and its nested objects alphabetically.
 * This is useful for consistent object serialization and comparison.
 *
 * @template T - The type of the object to sort
 * @param {T} obj - The object whose keys should be sorted
 * @returns {T} A new object with sorted keys
 * @example
 * const obj = { b: 2, a: 1, c: { f: 6, e: 5 } };
 * const sorted = sortObjectKeys(obj);
 * // Result: { a: 1, b: 2, c: { e: 5, f: 6 } }
 */
export function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  return Object.keys(obj)
    .sort()
    .reduce(
      (result: Record<string, unknown>, key: string) => {
        const value = obj[key];
        result[key] = sortObjectKeys(value as Record<string, unknown>);
        return result;
      },
      {} as Record<string, unknown>
    ) as T;
}
