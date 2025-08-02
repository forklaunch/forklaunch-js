/**
 * Computes a simple, non-cryptographic hash code for a given string.
 *
 * This function is synchronous and works in all JavaScript environments, including browsers and Node.js.
 * It is suitable for basic hashing needs such as object uniqueness checks, but should NOT be used for
 * cryptographic or security-sensitive purposes.
 *
 * The algorithm is based on a simple bitwise operation and may produce collisions for similar strings.
 *
 * @param {string} str - The input string to hash.
 * @returns {number} The resulting hash code as a 32-bit signed integer.
 *
 * @example
 * ```typescript
 * const hash = hashStringSync("hello");
 * console.log(hash); // e.g., 99162322
 * ```
 */
export function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
