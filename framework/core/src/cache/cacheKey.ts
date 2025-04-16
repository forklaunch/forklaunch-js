/**
 * Creates a function that generates cache keys with a given prefix.
 *
 * @param {string} cacheKeyPrefix - The prefix to use for all cache keys
 * @returns {Function} A function that takes an ID and returns a formatted cache key
 * @example
 * const createUserCacheKey = createCacheKey('user');
 * const key = createUserCacheKey('123'); // Returns 'user:123'
 */
export const createCacheKey = (cacheKeyPrefix: string) => (id: string) => {
  return `${cacheKeyPrefix}:${id}`;
};
