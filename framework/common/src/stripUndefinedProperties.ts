/**
 * Removes all properties with undefined values from an object. Note: this does NOT strip null values.
 * @param obj The object to strip undefined properties from
 * @returns A new object with all undefined properties removed
 */
export function stripUndefinedProperties<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
