/**
 * Check if the given object is a record.
 *
 * @param {unknown} obj - The object to check.
 * @returns {boolean} - True if the object is a record, false otherwise.
 */
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
