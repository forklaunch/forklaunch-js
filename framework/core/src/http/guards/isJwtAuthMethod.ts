import { JwtAuthMethods } from '../types/contractDetails.types';

export function isJwtAuthMethod(
  maybeJwtAuthMethod: unknown
): maybeJwtAuthMethod is JwtAuthMethods {
  return (
    typeof maybeJwtAuthMethod === 'object' &&
    maybeJwtAuthMethod !== null &&
    'jwt' in maybeJwtAuthMethod &&
    maybeJwtAuthMethod.jwt != null
  );
}
