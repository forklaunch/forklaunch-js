export function isNodeJsWriteableStream(
  value: unknown
): value is NodeJS.WritableStream {
  return (
    value != null &&
    typeof value === 'object' &&
    'write' in value &&
    typeof value.write === 'function' &&
    'end' in value &&
    typeof value.end === 'function'
  );
}
