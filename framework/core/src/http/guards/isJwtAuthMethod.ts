import { JwtAuthMethods } from '../types/contractDetails.types';

export function isJwtAuthMethod(
  maybeJwtAuthMethod: unknown
): maybeJwtAuthMethod is JwtAuthMethods {
  return (
    typeof maybeJwtAuthMethod === 'object' &&
    maybeJwtAuthMethod !== null &&
    (('signatureKey' in maybeJwtAuthMethod &&
      maybeJwtAuthMethod.signatureKey != null) ||
      ('jwksPublicKey' in maybeJwtAuthMethod &&
        maybeJwtAuthMethod.jwksPublicKey != null) ||
      ('jwksPublicKeyUrl' in maybeJwtAuthMethod &&
        maybeJwtAuthMethod.jwksPublicKeyUrl != null))
  );
}
