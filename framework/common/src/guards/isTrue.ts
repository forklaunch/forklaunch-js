/**
 * Type guard that checks if a value is exactly true.
 * This is useful for narrowing boolean types to the literal true value.
 *
 * @param {true} value - The value to check
 * @returns {boolean} Always returns true since the parameter is already typed as true
 * @example
 * const value: boolean = true;
 * if (isTrue(value)) {
 *   // value is now typed as true (not just boolean)
 * }
 */
export function isTrue(value: true) {
  return value;
}
