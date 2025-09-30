import { HmacMethods } from '../types/contractDetails.types';

/**
 * Type guard to determine if the provided value is an HmacMethods object.
 *
 * @param maybeHmacMethod - The value to check.
 * @returns True if the value is an object with a non-null 'hmac' property, otherwise false.
 */
export function isHmacMethod(
  maybeHmacMethod: unknown
): maybeHmacMethod is HmacMethods {
  return (
    typeof maybeHmacMethod === 'object' &&
    maybeHmacMethod !== null &&
    'hmac' in maybeHmacMethod &&
    maybeHmacMethod.hmac != null
  );
}
