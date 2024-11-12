export const createCacheKey = (cacheKeyPrefix: string) => (id: string) => {
  return `${cacheKeyPrefix}:${id}`;
};
