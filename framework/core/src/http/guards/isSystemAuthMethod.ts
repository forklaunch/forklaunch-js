export function isSystemAuthMethod(maybeSystemAuthMethod: unknown) {
  return (
    typeof maybeSystemAuthMethod === 'object' &&
    maybeSystemAuthMethod !== null &&
    'secretKey' in maybeSystemAuthMethod
  );
}
