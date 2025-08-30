import { HmacMethods } from '../types/contractDetails.types';

export function isHmacMethod(
  maybeHmacMethod: unknown
): maybeHmacMethod is HmacMethods {
  return (
    typeof maybeHmacMethod === 'object' &&
    maybeHmacMethod !== null &&
    'secretKey' in maybeHmacMethod &&
    maybeHmacMethod.secretKey != null
  );
}
