export function isAsyncGenerator<T>(
  value: unknown
): value is AsyncGenerator<T> {
  return (
    value != null &&
    typeof value === 'object' &&
    'next' in value &&
    typeof value.next === 'function' &&
    'return' in value &&
    typeof value.return === 'function' &&
    'throw' in value &&
    typeof value.throw === 'function'
  );
}
