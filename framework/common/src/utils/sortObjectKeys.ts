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
