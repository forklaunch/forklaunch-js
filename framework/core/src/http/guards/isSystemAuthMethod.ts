import { SystemAuthMethods } from '../types/contractDetails.types';

export function isSystemAuthMethod(
  maybeSystemAuthMethod: unknown
): maybeSystemAuthMethod is SystemAuthMethods {
  return (
    typeof maybeSystemAuthMethod === 'object' &&
    maybeSystemAuthMethod !== null &&
    'secretKey' in maybeSystemAuthMethod &&
    maybeSystemAuthMethod.secretKey != null
  );
}
