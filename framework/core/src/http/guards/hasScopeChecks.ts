export function hasScopeChecks(maybePermissionedAuth: unknown) {
  return (
    typeof maybePermissionedAuth === 'object' &&
    maybePermissionedAuth !== null &&
    'requiredScope' in maybePermissionedAuth &&
    maybePermissionedAuth.requiredScope != null &&
    'surfaceScopes' in maybePermissionedAuth &&
    maybePermissionedAuth.surfaceScopes != null
  );
}
