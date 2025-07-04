/**
 * Converts an object to a record.
 *
 * @template T - The type of the object to convert.
 * @param obj - The object to convert.
 * @returns The record.
 */
export function toRecord<T>(obj: T): Record<string, unknown> {
  return obj as Record<string, unknown>;
}
