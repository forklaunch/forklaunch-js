export function hasSend(
  res: unknown
): res is { send: (body: unknown) => void } {
  return typeof res === 'object' && res !== null && 'send' in res;
}
