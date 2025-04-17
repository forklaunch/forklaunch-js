/**
 * Compares two values for equality, handling special cases like BigInt.
 * For BigInt values, it uses direct equality comparison.
 * For other values, it compares their JSON string representations.
 *
 * @param {unknown} received - The value to compare
 * @param {unknown} expected - The expected value to compare against
 * @returns {void} The result of the comparison
 * @example
 * compare(123n, 123n); // true
 * compare({ a: 1 }, { a: 1 }); // true
 */
export const compare = (received: unknown, expected: unknown) => {
  switch (typeof received) {
    case 'bigint':
      return expect(expected).toEqual(received);
    default:
      return expect(JSON.stringify(expected)).toEqual(JSON.stringify(received));
  }
};
