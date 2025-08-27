import { BasicAuthMethods } from '../types/contractDetails.types';

export function isBasicAuthMethod(
  maybeBasicAuthMethod: unknown
): maybeBasicAuthMethod is BasicAuthMethods {
  return (
    typeof maybeBasicAuthMethod === 'object' &&
    maybeBasicAuthMethod !== null &&
    'basic' in maybeBasicAuthMethod &&
    maybeBasicAuthMethod.basic != null
  );
}
