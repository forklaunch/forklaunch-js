/**
 * Creates a function that generates objectstore keys with a given prefix.
 *
 * @param {string} objectStoreKeyPrefix - The prefix to use for all objectstore keys
 * @returns {Function} A function that takes an ID and returns a formatted objectstore key
 * @example
 * const createUserObjectStoreKey = createObjectStoreKey('user');
 * const key = createUserObjectStoreKey('123'); // Returns 'user:123'
 */
export const createObjectStoreKey =
  (objectStoreKeyPrefix: string) => (id: string | string[]) => {
    const idString = Array.isArray(id) ? id.join('-') : id;
    return `${objectStoreKeyPrefix}-${idString}`;
  };
