export function hasScopeChecks(maybePermissionedAuth: unknown) {
  return (
    typeof maybePermissionedAuth === 'object' &&
    maybePermissionedAuth !== null &&
    'requiredScope' in maybePermissionedAuth &&
    maybePermissionedAuth.requiredScope != null
  );
}
